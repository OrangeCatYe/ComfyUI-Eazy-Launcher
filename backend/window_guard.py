"""
窗口最小尺寸守护（独立进程）

由 backend/main.py 以子进程方式启动：
    python window_guard.py <min_width> <min_height>

设计目标：用户拖拽窗口边框时**根本拖不小**，而不是「先缩小再被改回来」。

------------------------------------------------------------------
为什么放弃轮询（重要）
------------------------------------------------------------------
上一版用轮询 + SetWindowPos：发现窗口小于最小值就改回来。
这必然闪烁 —— 用户拖拽时窗口先变小，守护再把它撑回去，
两者互相打架，视觉上就是持续抖动。用户明确否决了此方案。

------------------------------------------------------------------
当前方案：WM_GETMINMAXINFO 钩子（无闪烁）
------------------------------------------------------------------
Windows 在用户拖拽窗口边框前，会向该窗口发送 WM_GETMINMAXINFO
查询尺寸上下限。返回的 MINMAXINFO.ptMinTrackSize 即「拖拽能到达的
最小尺寸」。把它抬高到目标值，系统便在拖拽过程中直接夹住边界 ——
观感是「拖到边界就停住」，根本不会变小，也就没有任何闪烁。

难点在于窗口属于 Chrome 进程，Windows 不允许跨进程替换窗口过程
（SetWindowSubclass / SetWindowLongPtr 只对同进程窗口有效）。
解法：SetWindowsHookEx(WH_CALLWNDPROC) 让系统把我们的 DLL 注入
Chrome 进程，在进程内拦截消息。DLL 由 backend/native/winguard.c 编译。

钩子是**线程级**（只传目标窗口所属线程），不是全局钩子，
因此不会被注入到系统所有 GUI 进程，开销与风险都可控。

------------------------------------------------------------------
兜底
------------------------------------------------------------------
若 DLL 缺失或钩子安装失败（如被安全软件拦截），退化为轮询模式，
保证「最小尺寸」这个约束本身不丢失 —— 宁可闪烁，也不能让用户把
窗口缩到无法使用。（轮询仅在兜底时启用，正常路径完全不会走到。）
"""

import ctypes
import os
import sys
import time
from ctypes import wintypes

TITLE_KEY = "ComfyUI_KK"

# 与 winguard.c 约定一致
SHM_NAME_W = "KKMinW"
SHM_NAME_H = "KKMinH"

SW_SHOWMINIMIZED = 2
SWP_NOMOVE = 0x0002
SWP_NOZORDER = 0x0004
SWP_NOACTIVATE = 0x0010

IDLE_INTERVAL = 0.15

PAGE_READWRITE = 0x04
FILE_MAP_READ = 0x0004


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long), ("top", ctypes.c_long),
        ("right", ctypes.c_long), ("bottom", ctypes.c_long),
    ]


class WINDOWPLACEMENT(ctypes.Structure):
    _fields_ = [
        ("length", ctypes.c_uint), ("flags", ctypes.c_uint),
        ("showCmd", ctypes.c_uint),
        ("ptMinPosition", wintypes.POINT),
        ("ptMaxPosition", wintypes.POINT),
        ("rcNormalPosition", RECT),
    ]


def find_app_window(user32):
    """枚举顶层可见窗口，找到标题含 TITLE_KEY 的第一个。"""
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    def _enum(hwnd, _lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length <= 0:
            return True
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        if TITLE_KEY in buf.value:
            found.append(hwnd)
        return True

    user32.EnumWindows(_enum, 0)
    return found[0] if found else None


def wait_window(user32, timeout=60.0):
    """等待应用窗口出现（由 Eel 拉起，可能晚于本进程）。"""
    waited = 0.0
    while waited < timeout:
        hwnd = find_app_window(user32)
        if hwnd:
            return hwnd
        time.sleep(0.2)
        waited += 0.2
    return None


def wait_size_stable(user32, hwnd, need_stable=5, timeout=30.0):
    """
    等待窗口尺寸稳定后再安装钩子。

    Chrome 的 --app 窗口启动带缩放动画（实测 177x37 → 200x89 →
    825x647 → 目标尺寸）。动画期间窗口句柄可能重建，
    提前挂钩会挂到临时窗口上而失效。
    """
    stable = 0
    last = None
    waited = 0.0
    while waited < timeout:
        if not user32.IsWindow(hwnd):
            return False
        rect = RECT()
        if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            size = (rect.right - rect.left, rect.bottom - rect.top)
            if size == last:
                stable += 1
                if stable >= need_stable:
                    return True
            else:
                stable = 0
                last = size
        time.sleep(0.1)
        waited += 0.1
    return True


def publish_min_size(kernel32, min_w, min_h, handles):
    """
    把最小尺寸写入共享内存，供注入 Chrome 进程的 DLL 读取。

    必须用共享内存而不是命令行/环境变量：DLL 在 Chrome 进程里执行，
    拿不到本进程环境，只能靠跨进程共享数据传递。
    """
    # INVALID_HANDLE_VALUE = -1，表示创建由系统分页文件支撑的共享内存
    INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

    kernel32.CreateFileMappingW.restype = wintypes.HANDLE
    kernel32.CreateFileMappingW.argtypes = [
        wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
        wintypes.DWORD, wintypes.DWORD, wintypes.LPCWSTR,
    ]
    kernel32.MapViewOfFile.restype = wintypes.LPVOID
    kernel32.MapViewOfFile.argtypes = [
        wintypes.HANDLE, wintypes.DWORD, wintypes.DWORD,
        wintypes.DWORD, ctypes.c_size_t,
    ]

    size = ctypes.sizeof(ctypes.c_int)
    FILE_MAP_WRITE = 0x0002

    for name, value in ((SHM_NAME_W, min_w), (SHM_NAME_H, min_h)):
        mapping = kernel32.CreateFileMappingW(
            INVALID_HANDLE_VALUE, None, PAGE_READWRITE, 0, size, name,
        )
        if not mapping:
            return None
        view = kernel32.MapViewOfFile(mapping, FILE_MAP_WRITE, 0, 0, size)
        if not view:
            kernel32.CloseHandle(mapping)
            return None
        ctypes.cast(view, ctypes.POINTER(ctypes.c_int)).contents.value = value
        handles.append((mapping, view))
    return handles


def install_hook(user32, dll_path, hwnd):
    """
    加载钩子 DLL 并为目标窗口所属线程安装 WH_CALLWNDPROC 钩子。

    返回 (dll_handle, ok)。dll_handle 必须长期持有，
    否则被 GC 卸载后钩子回调会指向已释放内存而崩溃。
    """
    kernel32 = ctypes.windll.kernel32
    try:
        dll = kernel32.LoadLibraryW(dll_path)
    except Exception:
        return None, False
    if not dll:
        return None, False

    try:
        fn = ctypes.windll[dll_path].InstallGuardForWindow
    except Exception:
        try:
            fn = ctypes.WinDLL(dll_path).InstallGuardForWindow
        except Exception:
            return dll, False

    fn.restype = ctypes.c_bool
    fn.argtypes = [wintypes.HWND]
    try:
        ok = fn(wintypes.HWND(hwnd))
    except Exception:
        ok = False
    return dll, bool(ok)


def poll_min_size(user32, hwnd, min_w, min_h):
    """
    兜底轮询：钩子不可用时使用。

    注意：这条路径会有闪烁（与用户拖拽打架），仅在钩子
    安装失败时启用，属于「有约束但手感差」，好过完全无约束。
    """
    while True:
        try:
            if not user32.IsWindow(hwnd):
                return
            wp = WINDOWPLACEMENT()
            wp.length = ctypes.sizeof(WINDOWPLACEMENT)
            if user32.GetWindowPlacement(hwnd, ctypes.byref(wp)):
                if wp.showCmd == SW_SHOWMINIMIZED:
                    time.sleep(IDLE_INTERVAL)
                    continue
            rect = RECT()
            if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                w = rect.right - rect.left
                h = rect.bottom - rect.top
                nw = max(w, min_w)
                nh = max(h, min_h)
                if nw != w or nh != h:
                    user32.SetWindowPos(
                        hwnd, 0, 0, 0, nw, nh,
                        SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
                    )
        except Exception:
            return
        time.sleep(IDLE_INTERVAL)


def main():
    if len(sys.argv) < 3:
        return 1
    try:
        min_w = int(sys.argv[1])
        min_h = int(sys.argv[2])
    except ValueError:
        return 1

    try:
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
    except Exception:
        return 1

    # 1) 先把最小尺寸发布到共享内存（DLL 注入后要读）
    handles = []
    publish_min_size(kernel32, min_w, min_h, handles)

    # 2) 定位 DLL：与本脚本同级的 native/winguard64.dll
    here = os.path.dirname(os.path.abspath(__file__))
    dll_path = os.path.join(here, "native", "winguard64.dll")

    while True:
        hwnd = wait_window(user32)
        if not hwnd:
            time.sleep(1)
            if find_app_window(user32) is None:
                # 主程序可能已退出
                time.sleep(1)
                if find_app_window(user32) is None:
                    return 0
            continue

        if not wait_size_stable(user32, hwnd):
            continue

        dll, ok = (None, False)
        if os.path.isfile(dll_path):
            dll, ok = install_hook(user32, dll_path, hwnd)

        if ok:
            """
            钩子已生效：本进程无需再做任何事。
            但不能退出 —— 必须保持 DLL 加载状态，
            进程退出会导致 DLL 卸载、钩子失效。
            这里只需低频检查窗口是否还在，用于决定何时收工。
            """
            while user32.IsWindow(hwnd):
                time.sleep(1.0)
            # 窗口关闭：继续外层循环，等待下次打开
            continue

        # 钩子不可用 → 兜底轮询
        poll_min_size(user32, hwnd, min_w, min_h)
        time.sleep(1)


if __name__ == "__main__":
    sys.exit(main())
