"""临时验证：真实鼠标拖拽 + 对照实验。

为什么必须做对照：
    单独看"有钩子时窗口没变小"，无法区分两种情况——
      (a) 钩子生效，拖不动
      (b) 拖拽模拟本身没生效，窗口压根没收到事件
    只有"关掉钩子后同样操作能缩小"，才能证明 (a)。

鼠标事件用 SendInput 走系统真实输入路径，
确保触发 Chrome 的尺寸调整循环（此前用 PostMessage 模拟
鼠标消息，窗口纹丝不动，属无效模拟）。

流程：
  1. 记录起始尺寸
  2. 【无钩子】真实拖拽右下角向内 → 应能缩小（证明拖拽有效）
  3. 恢复尺寸
  4. 【有钩子】同样拖拽 → 应被夹在 min_w x min_h

跑完请删除本文件。
"""
import ctypes
import os
import sys
import time
from ctypes import wintypes

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import window_guard as wg  # noqa: E402

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

MIN_W, MIN_H = 1280, 820

INPUT_MOUSE = 0
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_ABSOLUTE = 0x8000

ULONG_PTR = ctypes.c_ulonglong if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [("dx", ctypes.c_long), ("dy", ctypes.c_long),
                ("mouseData", ctypes.c_ulong), ("dwFlags", ctypes.c_ulong),
                ("time", ctypes.c_ulong), ("dwExtraInfo", ULONG_PTR)]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [("wVk", ctypes.c_ushort), ("wScan", ctypes.c_ushort),
                ("dwFlags", ctypes.c_ulong), ("time", ctypes.c_ulong),
                ("dwExtraInfo", ULONG_PTR)]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [("uMsg", ctypes.c_ulong),
                ("wParamL", ctypes.c_ushort), ("wParamH", ctypes.c_ushort)]


class INPUTUNION(ctypes.Union):
    _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT), ("hi", HARDWAREINPUT)]


class INPUT(ctypes.Structure):
    _fields_ = [("type", ctypes.c_ulong), ("union", INPUTUNION)]


class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]


def send_mouse(flags, x, y):
    """用 SendInput 发一个绝对坐标鼠标事件（0..65535 归一化）。"""
    inp = INPUT()
    inp.type = INPUT_MOUSE
    inp.union.mi.dx = int(x * 65535 / ctypes.windll.user32.GetSystemMetrics(0))
    inp.union.mi.dy = int(y * 65535 / ctypes.windll.user32.GetSystemMetrics(1))
    inp.union.mi.dwFlags = flags | MOUSEEVENTF_ABSOLUTE
    inp.union.mi.time = 0
    inp.union.mi.dwExtraInfo = 0
    user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))
    time.sleep(0.02)


def real_drag(from_xy, to_xy, steps=25):
    """真实按下 → 移动 → 松开。"""
    fx, fy = from_xy
    tx, ty = to_xy
    send_mouse(MOUSEEVENTF_MOVE, fx, fy)
    time.sleep(0.1)
    send_mouse(MOUSEEVENTF_LEFTDOWN, fx, fy)
    time.sleep(0.1)
    for i in range(1, steps + 1):
        x = fx + (tx - fx) * i / steps
        y = fy + (ty - fy) * i / steps
        send_mouse(MOUSEEVENTF_MOVE, x, y)
    time.sleep(0.1)
    send_mouse(MOUSEEVENTF_LEFTUP, tx, ty)
    time.sleep(0.6)


def size_of(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.right - r.left, r.bottom - r.top


hwnd = wg.find_app_window(user32)
print("窗口句柄:", hwnd)
if not hwnd:
    sys.exit("未找到窗口")

handles = []
wg.publish_min_size(kernel32, MIN_W, MIN_H, handles)

dll_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "native", "winguard64.dll")

# 先把窗口放得足够大，保证有缩小空间
r = RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
start = size_of(hwnd)
print("起始尺寸:", start)

# 目标：拖到比阈值小很多的尺寸
target_w, target_h = 700, 400
grab = (r.right - 8, r.bottom - 8)   # 右下角内缩几像素，命中边框
drop = (r.left + target_w, r.top + target_h)

print("\n目标拖拽: 右下角 → {}x{}\n".format(target_w, target_h))

# ============ 阶段 1：无钩子 ============
print("=== [阶段1] 无钩子：应能自由缩小 ===")
real_drag(grab, drop)
time.sleep(0.5)
w1, h1 = size_of(hwnd)
print("    拖后尺寸: {} x {}".format(w1, h1))
freely_shrunk = (w1 < MIN_W) or (h1 < MIN_H)
print("    判定:", "拖拽有效（能缩小到阈值以下）" if freely_shrunk
      else "拖拽未生效，本测试无效")

# ============ 恢复尺寸 ============
print("\n恢复窗口到 1440x900 ...")
user32.SetWindowPos(hwnd, 0, r.left, r.top, 1440, 900, 0)
time.sleep(1.0)
print("    恢复后:", size_of(hwnd))

# ============ 阶段 2：有钩子 ============
print("\n=== [阶段2] 有钩子：应被夹在 {}x{} ===".format(MIN_W, MIN_H))
dll, ok = wg.install_hook(user32, dll_path, hwnd)
print("    钩子安装:", ok)
time.sleep(1.0)

r2 = RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r2))
grab2 = (r2.right - 8, r2.bottom - 8)
drop2 = (r2.left + target_w, r2.top + target_h)
before2 = size_of(hwnd)
print("    拖拽前:", before2)

real_drag(grab2, drop2)
time.sleep(0.5)
w2, h2 = size_of(hwnd)
print("    拖后尺寸: {} x {}".format(w2, h2))

w_ok = w2 >= MIN_W
h_ok = h2 >= MIN_H
print("\n=== 最终判定 ===")
print("宽度限制: {} ({} >= {})".format("生效" if w_ok else "未生效", w2, MIN_W))
print("高度限制: {} ({} >= {})".format("生效" if h_ok else "未生效", h2, MIN_H))
print("拖拽有效性:", "有效" if freely_shrunk else "无效（结论不可信）")
print("结论:", "宽高均被限制" if (w_ok and h_ok and freely_shrunk)
      else "需人工确认")
