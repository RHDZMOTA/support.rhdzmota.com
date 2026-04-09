import os
import pkgutil
import importlib
from functools import cache
from typing import Optional
from dataclasses import dataclass

import fire

from rhdzmota.support.frontend.views import __path__ as frontend_views_path


class Main:
    default_streamlit_home: Optional[str] = None
    default_streamlit_module_views: Optional[str] = None

    @property
    @cache
    def streamlit_home(self) -> str:
        return os.environ.get(
            "DEFAULT_STREAMLIT_HOME",
            default="main",
        )

    @property
    @cache
    def streamlit_module_views(self) -> str:
        return os.environ.get(
            "DEFAULT_STREAMLIT_MODULE_VIEWS",
            default="rhdzmota.support.frontend.views",
        )

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def detect(self):
        return [
            module.name
            for module in pkgutil.walk_packages(frontend_views_path)
            if (module_name := module.name) != self.streamlit_home
        ]

    def build_page(self, page_name: str) -> bool:
        with open("./template.txt", "r") as file_template:
            template = file_template.read()
        with open(f"./pages/{page_name.title()}.py", "w") as file_page:
            file_page.write(template.format(page_name=page_name))
        return True


    def build_all(self) -> dict[str, bool]:
        return {
            page_name: self.build_page(page_name=page_name)
            for page_name in self.detect()
        }


if __name__ == "__main__":
    with Main() as main:
        fire.Fire(main)
