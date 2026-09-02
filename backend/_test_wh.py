"""临时验证：分别测试「宽度」与「高度」两个方向的最小限制。

背景：用户反馈感觉只限制了长度（宽度）。本脚本分别尝试：
  A. 只压窄宽度（保持高度大）→ 观察宽度是否被夹在 min_w
  B. 只压矮高度（保持宽度大）→ 观察高度是否被夹在 min_h
  C. 同时压小两者        → 观察是否被夹在 (min_w, min_h)

注意：不能用 SendMessageW(WM_GETMINMAXINFO) 检测，
      它绕过 DispatchMessage，钩子拦截不到（此前已踩坑）。
      这里改用真实鼠标拖拽路径。

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
WM_NCLBUTTONDOWN = 0x00A1
WM_MOUSEMOVE = 0x0200
WM_LBUTTONUP = 0x0202
MK_LBUTTON = 0x0001
HTRIGHT = 11      # 右边框：只改宽度
HTBOTTOM = 15     # 下边框：只改高度
HTBOTTOMRIGHT = 17


class RECT(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]


def size_of(hwnd):
    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    return r.right - r.left, r.bottom - r.top


def drag(hwnd, hit_test, start_xy, end_xy):
    """用真实鼠标消息模拟拖拽某个边框。"""
    sx, sy = start_xy
    ex, ey = end_xy
    user32.PostMessageW(hwnd, WM_NCLBUTTONDOWN, hit_test,
                        (sy << 16) | (sx & 0xFFFF))
    time.sleep(0.15)
    for _ in range(8):
        user32.PostMessageW(hwnd, WM_MOUSEMOVE, MK_LBUTTON,
                            (ey << 16) | (ex & 0xFFFF))
        time.sleep(0.03)
    user32.PostMessageW(hwnd, WM_LBUTTONUP, 0, (ey << 16) | (ex & 0xFFFF))
    time.sleep(0.4)


hwnd = wg.find_app_window(user32)
print("窗口句柄:", hwnd)
if not hwnd:
    sys.exit("未找到窗口")

handles = []
wg.publish_min_size(kernel32, MIN_W, MIN_H, handles)
dll_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "native", "winguard64.dll")
dll, ok = wg.install_hook(user32, dll_path, hwnd)
print("钩子安装:", ok)
time.sleep(1.0)

print("\n目标约束: 宽 >= {}, 高 >= {}\n".format(MIN_W, MIN_H))

# 先统一放大，排除「本来就已经小于阈值」的干扰
r = RECT()
user32.GetWindowRect(hwnd, ctypes.byref(r))
print("起始尺寸:", size_of(hwnd))

# --- A. 只压窄宽度（拖右边框向左）---
print("\n[A] 拖右边框向左，目标宽 600（高度不变）")
user32.GetWindowRect(hwnd, ctypes.byref(r))
drag(hwnd, HTRIGHT, (r.right - 5, r.top + 300), (r.left + 600, r.top + 300))
w_a, h_a = size_of(hwnd)
print("    结果: {} x {}  -> 宽度{}".format(
    w_a, h_a, "PASS" if w_a >= MIN_W else "FAIL"))

# --- B. 只压矮高度（拖下边框向上）---
print("\n[B] 拖下边框向上，目标高 300（宽度不变）")
user32.GetWindowRect(hwnd, ctypes.byref(r))
drag(hwnd, HTBOTTOM, (r.left + 300, r.bottom - 5), (r.left + 300, r.top + 300))
w_b, h_b = size_of(hwnd)
print("    结果: {} x {}  -> 高度{}".format(
    w_b, h_b, "PASS" if h_b >= MIN_H else "FAIL"))

# --- C. 同时压小（拖右下角）---
print("\n[C] 拖右下角向内，目标 500x300")
user32.GetWindowRect(hwnd, ctypes.byref(r))
drag(hwnd, HTBOTTOMRIGHT, (r.right - 5, r.bottom - 5), (r.left + 500, r.top + 300))
w_c, h_c = size_of(hwnd)
print("    结果: {} x {}  -> {}".format(
    w_c, h_c, "PASS" if (w_c >= MIN_W and h_c >= MIN_H) else "FAIL"))

print("\n=== 汇总 ===")
print("宽度限制:", "生效" if w_a >= MIN_W else "未生效")
print("高度限制:", "生效" if h_b >= MIN_H else "未生效")
print("最终尺寸: {} x {}".format(*size_of(hwnd)))
