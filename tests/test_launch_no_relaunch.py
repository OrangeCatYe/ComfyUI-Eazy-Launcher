# -*- coding: utf-8 -*-
"""
回归验证：关闭窗口后不得再次拉起前端。

缺陷：main() 三层嵌套 eel.start 把 Eel 的正常退出信号 SystemExit
误判为「启动失败」，导致关一次拉起一次（chrome -> edge -> default）。

本测试用假 eel 模拟「关闭窗口时抛 SystemExit」，
断言 eel.start 只被调用一次（旧实现会调用两次及以上）。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import backend.main as m  # noqa: E402


class FakeEel:
    """模拟 eel.start：第一次(block=True)抛 SystemExit，模拟用户关窗口。"""

    def __init__(self):
        self.calls = []

    def start(self, *args, **kwargs):
        self.calls.append(kwargs.get('mode'))
        raise SystemExit(0)


def _run(monkeypatched_eel):
    # 测试文件位于 tests/ 下，dist 在项目根目录（上一级）
    m.WEB_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist'
    )
    m._inject_eel_js = lambda: None
    m._prewarm_ffmpeg = lambda: None
    m.eel = monkeypatched_eel
    return m.main()


def test_close_window_does_not_relaunch():
    fake = FakeEel()
    rc = _run(fake)
    assert rc == 0, 'main() 应正常返回 0'
    assert len(fake.calls) == 1, (
        '关闭窗口后不应再次拉起前端，但 eel.start 被调用了 {} 次：{}'.format(
            len(fake.calls), fake.calls
        )
    )
    assert fake.calls[0] in ('chrome', 'edge', 'default')


def test_oserror_falls_back_exactly_once():
    """真实启动失败（OSError）仍降级，但只降级一次。"""

    class FailThenExit(FakeEel):
        def start(self, *args, **kwargs):
            self.calls.append(kwargs.get('mode'))
            if len(self.calls) == 1:
                raise OSError('browser blocked by policy')
            raise SystemExit(0)

    fake = FailThenExit()
    rc = _run(fake)
    assert rc == 0
    assert len(fake.calls) == 2, 'OSError 应只触发一次降级，实得：{}'.format(fake.calls)
    assert fake.calls[1] == 'default'


def test_pick_browser_mode_returns_valid_mode():
    mode, why = m._pick_browser_mode()
    assert mode in ('chrome', 'edge', 'default'), '探测到非法 mode：{}'.format(mode)
    assert isinstance(why, str) and why
