import textwrap
from typing import Optional
from dataclasses import dataclass

import streamlit as st

from rhdzmota.support.settings import Environ
from rhdzmota.support.resources import SupportResources


@dataclass(frozen=True, slots=True)
class HotlineResourceAdmin:
    overwrite_session_key_hotline_stage: Optional[str] = None
    overwrite_session_key_hotline_request_from: Optional[str] = None

    @property
    def session_key_hotline_stage(self) -> str:
        return self.overwrite_session_key_hotline_stage or "hotline_stage"

    @property
    def session_key_hotline_request_from(self) -> str:
        return self.overwrite_session_key_hotline_request_from or "hotline_request_from"

    def set_stage(self, stage: str, not_rerun: bool = False):
        st.session_state[self.session_key_hotline_stage] = stage
        # Early exit if rerun is not required
        if not_rerun:
            return
        st.rerun()

    @property
    def stage_request_access_with_email(self) -> str:
        return "hotline-request-access-with-email"
    
    def form_request_access_with_email(self):
        if "cc" not in st.session_state:
            st.session_state["cc"] = []
        with st.form(f"from-{self.stage_request_access_with_email}"):
            email = st.text_input("Corporate email")
            passcode = st.text_input("Passcode (optional)") or ""
            include_zoom = st.checkbox("Include Zoom")
            submitted = st.form_submit_button("Get Confirmation Code")
        if not submitted:
            return
        st.session_state[self.session_key_hotline_request_from] = email
        # TODO: Is this the best we can do to verify email?
        if "@" not in email:
            st.error(f"Email validation error... please verify the provided email: {email}")
            return
        _, domain = email.split("@")
        if domain not in Environ.SUPPORT_DOMAINS.value.split(","):
            st.error(f"Email domain not supported: {domain}")
            return
        # Verify if the user provides a valid passcode 
        if not passcode:
            # TODO: Send confirmation email
            if True:
                return st.error(
                    "Not implemented error: "
                    "Email-based passcode verification hasn't been enabled."
                )
            self.set_stage(stage=self.stage_confirm_access_with_code)
        elif passcode in Environ.SUPPORT_PASSCODES.value.split(","):
            return self.set_stage(stage=self.stage_hotline_info)
        else:
            return st.error("Email or passcode error, please try again.")

    @property
    def stage_confirm_access_with_code(self) -> str:
        return "hotline-confirm-access-with-code"

    def form_confirm_access_with_code(self):
        st.info(
            "Check your email for the confirmation code! "
            "Or use your company support passcode."
        )
        if st.button("Reset"):
            return self.set_stage(stage=self.stage_request_access_with_email)
        with st.form(f"from-{self.stage_confirm_access_with_code}"):
            code = st.text_input("Verification Code")
            submitted = st.form_submit_button("Start Hotline")
        if not submitted:
            return
        # TODO: Verify code
        # Display hotline info! TODO: Set params
        self.set_stage(stage=self.stage_hotline_info)


    @property
    def stage_hotline_info(self) ->  str:
        return "hotline_info"

    def display_hotline_info(self):
        # Reset option always on top.
        if st.button("Reset"):
            return self.set_stage(stage=self.stage_request_access_with_email)
        # Hotline Info Content
        st.markdown("## Hotline info")
        if st.button("Share"):
            return self.set_stage(stage=self.stage_hotline_share_with_coworker)
        support_resources = SupportResources()
        st.markdown(support_resources.get_content("hotline.txt"))

    @property
    def session_key_hotline_share_with_coworker(self) -> str:
        return "hotline_share_with_coworker"

    @property
    def stage_hotline_share_with_coworker(self) -> str:
        return "stage_hotline_share_with_coworker"

    def display_hotline_share_with_coworker(self) -> str:
        if st.button("Return"):
            return self.set_stage(stage=self.stage_hotline_info)
        session_key = self.session_key_hotline_share_with_coworker
        if session_key not in st.session_state:
            st.session_state[session_key] = []

        st.markdown("## Share with coworker")
        coworkers = st.session_state[session_key]
        if coworkers:
            st.text("Current list of coworkers:")
            st.table({"email": coworkers})
            if st.button("Clean list"):
                st.session_state[session_key] = []
                st.rerun()
        coworker = st.text_input("Add coworker email")
        if st.button("Add"):
            # TODO: Validate coworker email
            with st.spinner(text="Validating coworker email..."):
                _, domain = st.session_state[self.session_key_hotline_request_from].split("@")
                if not coworker.endswith(domain):
                    return st.error("Coworker domain doesn't match your domain.")
                st.session_state[session_key].append(coworker)
                st.info("Coworker added!")
            return self.set_stage(self.stage_hotline_share_with_coworker)
        if st.button("Share"):
            # TODO: Send emails 
            st.error("Sharing to coworkers has not yet been implemented!")
            #return self.set_stage(self.stage_hotline_info)

    
    @property
    def current_stage(self) -> str:
        return st.session_state[self.session_key_hotline_stage]


    def start(self):
        if self.session_key_hotline_stage not in st.session_state:
            st.session_state[self.session_key_hotline_stage] = \
                    self.stage_request_access_with_email
        match st.session_state[self.session_key_hotline_stage]:
            case self.stage_request_access_with_email:
                return self.form_request_access_with_email()
            case self.stage_confirm_access_with_code:
                return self.form_confirm_access_with_code()
            case self.stage_hotline_info:
                return self.display_hotline_info()
            case self.stage_hotline_share_with_coworker:
                return self.display_hotline_share_with_coworker()


def view():
    st.markdown(
        textwrap.dedent(
            f"""
            # Support Hotline

            The `Support Hotline` should be used to request having an urgent working session
            with [Rodrigo H. Mota](https://rhdzmota.com) and/or the support engineering team.

            You can request the support-hotline info by submitting a valid corporate email
            and the veryfing the confirmation code.

            """
        )
    )
    hotline_resource_admin = HotlineResourceAdmin()
    hotline_resource_admin.start()
