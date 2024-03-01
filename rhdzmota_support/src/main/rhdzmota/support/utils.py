import enum
from functools import cache


class PriorityComponent(enum.Enum):

    @classmethod
    def get_ordered_labels(cls):
        return ["LOW", "MEDIUM", "HIGH"]

    @classmethod
    def get_levels(cls):
        return [
            (label, i / 2) 
            for i, label in enumerate(cls.get_ordered_labels())
        ]

    @classmethod
    @property
    @cache
    def importance(cls):
        return cls(
            value="importance",
            names=cls.get_levels(),
        )

    @classmethod
    @property
    @cache
    def urgency(cls):
        return cls(
            value="urgency",
            names=cls.get_levels(),
        )

class PriorityLevel(enum.Enum):
    NOT_A = 0
    LOW = 0.5
    MEDIUM = 1
    HIGH = 1.5
    TOP = 2

    @property
    def tag(self) -> str:
        level_name = self.name.replace("_", " ")
        return f"{level_name} priority".title()

    @classmethod
    def from_components(
            cls,
            importance: PriorityComponent.importance,
            urgency: PriorityComponent.urgency,
        ) -> 'PriorityLevel':
        value = importance.value + urgency.value
        return cls(value)
