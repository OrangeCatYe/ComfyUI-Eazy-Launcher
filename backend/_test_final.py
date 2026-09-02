"""临时验证：在真实消息派发路径下确认宽、高最小值。

关键：普通 SendMessageW(WM_GETMINMAXINFO) 绕过 DispatchMessage，
      钩子拦截不到（此前踩坑，导致误判为"未生效"）。
      这里调用 DLL 内的 QueryMinTrack —— 它用 PostMessage +
      PeekMessage/DispatchMessage 让消息真正走派发路径，
      从而在钩子内读到改写后的值。

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

dll_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "native", "winguard64.dll")

MIN_W, MIN_H = 1280, 820

hwnd = wg.find_app_window(user32)
print("窗口句柄:", hwnd)
if not hwnd:
    sys.exit("未找到窗口")

handles = []
wg.publish_min_size(kernel32, MIN_W, MIN_H, handles)

dll, ok = wg.install_hook(user32, dll_path, hwnd)
print("钩子安装:", ok)
if not ok:
    sys.exit(1)
time.sleep(1.0)

lib = ctypes.WinDLL(dll_path)
q = lib.QueryMinTrack
q.restype = ctypes.c_bool
q.argtypes = [wintypes.HWND, ctypes.POINTER(ctypes.c_long),
              ctypes.POINTER(ctypes.c_long)]

w_val = ctypes.c_long(0)
h_val = ctypes.c_long(0)

print("\n目标配置: 宽 >= {}, 高 >= {}\n".format(MIN_W, MIN_H))

r = lib.QueryMinTrack(wintypes.HWND(hwnd), ctypes.byref(w_val), ctypes.byref(h_val))
print("QueryMinTrack 返回:", r)
print("实际生效的最小跟踪尺寸: {} x {}".format(w_val.value, h_val.value))

w_ok = w_val.value >= MIN_W
h_ok = h_val.value >= MIN_H
print("\n=== 分方向判定 ===")
print("宽度限制: {} (期望 >= {}, 实得 {})".format(
    "生效" if w_ok else "未生效", MIN_W, w_val.value))
print("高度限制: {} (期望 >= {}, 实得 {})".format(
    "生效" if h_ok else "未生效", MIN_H, h_val.value))
print("\n结论:", "宽度与高度均已限制" if (w_ok and h_ok) else "存在未限制的方向")

# 再改一次配置，确认动态生效
print("\n=== 动态改配置测试：改为 1400x900 ===")
wg.publish_min_size(kernel32, 1400, 900, handles)
time.sleep(0.5)
w2 = ctypes.c_long(0)
h2 = ctypes.c_long(0)
lib.QueryMinTrack(wintypes.HWND(hwnd), ctypes.byref(w2), ctypes.byref(h2))
print("改为 1400x900 后读到: {} x {}".format(w2.value, h2.value))
print("结果:", "PASS" if (w2.value >= 1400 and h2.value >= 900) else "FAIL")
