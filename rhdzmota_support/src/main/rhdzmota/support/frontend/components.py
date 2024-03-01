from dataclasses import dataclass
from typing import Optional

import streamlit as st

from rhdzmota.support.settings import Environ
from rhdzmota.support.frontend.router import PageFlowRunnable

@dataclass(frozen=True, slots=True)
class FlowError(PageFlowRunnable):
    
    def run(self, **kwargs):
        st.error("An issue was detected")


@dataclass(frozen=True, slots=True)
class FlowRequestAccessViaEmail(PageFlowRunnable):
    reference_flow_success: str
    reference_flow_require_email_verification_code: str
    overwrite_component_subtitle: Optional[str] = None
    overwrite_submit_button_label: Optional[str] = None

    @property
    def submit_button_label(self) -> str:
        return self.overwrite_submit_button_label or "Submit"

    @property
    def component_subtitle(self) -> str:
        return self.overwrite_component_subtitle or "Request Access Via Email"

    def run(self, **kwargs):
        st.markdown(f"## {self.component_subtitle}")
        with st.form("form-" + type(self).__name__):
            email = st.text_input("Corporate email")
            passcode = st.text_input("Passcode (optional)")
            submitted = st.form_submit_button(self.submit_button_label)
        if not submitted:
            return
        st.session_state["email_main"] = email
        # TODO: Implement email validation
        if "@" not in email:
            return st.error(f"Email validation error.")
        # Verify that the email contains a valid domain
        _, domain = email.split("@")
        if domain not in Environ.SUPPORT_DOMAINS.value.split(","):
            return st.error(f"Email domain not supported.")
        if not passcode:
            # TODO: Send confirmation email
            #if True:
            #    return st.error("Not implementated error.")
            self.set_next("canonical_error")
        elif passcode in Environ.SUPPORT_PASSCODES.value.split(","):
            return self.set_next(self.reference_flow_success)
