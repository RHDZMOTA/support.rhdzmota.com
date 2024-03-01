import enum
from dataclasses import dataclass
from typing import Callable, Optional

import streamlit as st



@dataclass(frozen=True, slots=True)
class PageFlowRunnable:

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    @classmethod
    def inline(cls, func: Callable) -> 'PageFlow':
        return type("<undefined>", (cls,), {"run": func})

    def backward(self):
        before = st.session_state["page_flow_stage_history"].pop(-1)
        self.set_next(before, exclude_from_history=True)

    def set_next(
            self,
            page_flow_key: str,
            exclude_from_history: bool = False,
            **kwargs
        ):
        # Get the current page flow stage
        source = st.session_state["page_flow_stage"]
        # Set the next page flow stage and propagate kwargs
        st.session_state["page_flow_stage"] = page_flow_key
        st.session_state["page_flow_stage_kwargs"] = kwargs
        # Register flow history
        history_key = "page_flow_stage_history"
        if history_key not in st.session_state:
            st.session_state[history_key] = [source]
        elif not exclude_from_history:
            st.session_state[history_key].append(source)
        # Rerun to apply changes
        st.rerun()

    def run(self, **kwargs):
        raise NotImplemented


@dataclass(frozen=True, slots=True)
class FlowError(PageFlowRunnable):

    def run(self, **kwargs):
        st.error("An issue was detected")
        if st.button("Return"):
            self.backward()


class PageFlowCatalog(enum.Enum):

    @classmethod
    def from_runnables(
            cls,
            catalog_name: str,
            runnables: list[PageFlowRunnable],
            exclude_error_flow: bool = False,
        ):
        return cls(
            value=catalog_name,
            names=[
                (getattr(runnable, "refname", type(runnable).__name__), runnable)
                for runnable in runnables
            ] + (
                [] if exclude_error_flow else [
                    ("canonical_error", FlowError())
                ]
            )
        )
    @classmethod 
    def execute(cls, start_page_key: str, **kwargs):
        # Set the start page flow key if not defined
        if "page_flow_stage" not in st.session_state:
            st.session_state["page_flow_stage"] = cls[start_page_key].name
            st.session_state["page_flow_stage_kwargs"] = kwargs
        # Load the corresponding flow stage and re-run application
        with cls[st.session_state["page_flow_stage"]].value as flow:
            flow.run(
                **st.session_state.get(
                    "page_flow_stage_kwargs",
                    {}
                )
        )
