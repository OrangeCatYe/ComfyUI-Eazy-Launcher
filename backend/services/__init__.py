"""
后端服务包

按职责拆分为若干服务模块，每个模块的函数统一返回：
    { ok: bool, data: dict, error: str, log: [str] }
由 main.py 的 @eel.expose 包装后暴露给前端。
"""
