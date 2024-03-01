import textwrap

import streamlit as st

from rhdzmota.support.utils import PriorityComponent, PriorityLevel
from rhdzmota.support.frontend.components import FlowRequestAccessViaEmail
from rhdzmota.support.frontend.router import (
    PageFlowCatalog,
    PageFlowRunnable,
)


class Headers:

    def __enter__(self):
        st.markdown("# Support Tickets")
        col_desc, col_buttons = st.columns([1, 0.15])
        with col_desc:
            st.markdown(
                "Simple ticketing system designed by "
                "[Rodrigo H. Mota](https://rhdzmota.com) using streamlit."
            )
                    
        with col_buttons:
            inner_col_left, inner_col_right = st.columns([0.1, 0.1])
            with inner_col_left:
                if st.button("Return"):
                    self.backward()
            with inner_col_right:
                if st.button("Reset"):
                    self.set_next(CustomFlowRequestAccessViaEmail.__name__)
        
        return self

    def __exit__(self, *args):
        pass

class CustomFlowRequestAccessViaEmail(Headers, FlowRequestAccessViaEmail):
    pass

class FlowTicketSubmit(Headers, PageFlowRunnable):
    def run(self, **kwargs):
        st.markdown("## New Ticket")
        with st.form("form-" + FlowTicketSubmit.__name__):
            title = st.text_input("Short Title")
            description = st.text_area("Description")
            importance = st.selectbox(
                label="Importance (value added)",
                options=[
                    option
                    for option in PriorityComponent.importance
                ],
                format_func=lambda opt: opt.name.title(),
            )
            urgency = st.selectbox(
                label="Time sensitivity (urgency)",
                options=[
                    option
                    for option in PriorityComponent.urgency
                ],
                format_func=lambda opt: opt.name.title(),
            )
            submitted = st.form_submit_button("Preview")
        if not submitted:
            return

        st.markdown(f"### {title}")
        st.markdown(description)
        st.table(
            [
                {
                    "Key": type(level).__name__.title(),
                    "Val": level.name.title()
                }
                for level in (importance, urgency)
            ]
        )
        
        priority = PriorityLevel.from_components(importance=importance, urgency=urgency)
        st.markdown(f"Detected Priority Level: `{priority.tag}`")

        if st.button("Create"):
            # TODO: Create ticket
            with st.spinner("Creating new request..."):
                import time
                time.sleep(3)
                st.info("Not implemented...")
            self.set_next(FlowTicketReview.__name__)

class FlowTicketReview(Headers, PageFlowRunnable):
    def run(self, **kwargs):
        if st.button("New Ticket"):
            self.set_next(FlowTicketSubmit.__name__)
        st.markdown("## Tickets")
        st.info("Not implemented...")


def view():
    flow_catalog = PageFlowCatalog.from_runnables(
        catalog_name=__name__,
        runnables=[
            FlowTicketSubmit(),
            FlowTicketReview(),
            CustomFlowRequestAccessViaEmail(
                reference_flow_success=FlowTicketReview.__name__,
                reference_flow_require_email_verification_code="canonical_error",
            ),
        ]
    )
    flow_catalog.execute(
        start_page_key=CustomFlowRequestAccessViaEmail.__name__
    )

