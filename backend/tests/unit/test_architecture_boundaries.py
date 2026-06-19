from importlib import import_module


def test_backend_refactor_boundaries_are_importable() -> None:
    modules = [
        "app.api.v1.router",
        "app.application.content.service",
        "app.application.ads.service",
        "app.application.display.service",
        "app.application.display_control.service",
        "app.shared.errors.application_errors",
    ]

    for module in modules:
        assert import_module(module)
