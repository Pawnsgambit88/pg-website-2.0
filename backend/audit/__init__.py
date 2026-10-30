def write(request, **kwargs):
    """Strict audit write; see audit.writer. Lazy import keeps the app registry loadable."""
    from .writer import write as _write

    return _write(request, **kwargs)
