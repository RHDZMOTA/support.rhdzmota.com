import os
from typing import Optional
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class SupportResources:
    overwrite_resources_path: Optional[str] = None

    @property
    def resources_path(self) -> str:
        default, *_ = __path__
        return self.overwrite_resources_path or default

    @property
    def resources_list(self) -> list[str]:
        return [file for file in os.listdir(self.resources_path)]

    def get_content(self, filename: str) -> str:
        with open(os.path.join(self.resources_path, filename), "r") as file:
            return file.read()

    def get_json(filename: str, **kwargs) -> dict:
        import json

        return json.loads(self.get_content(filename=filename), **kwargs)

