import os
import streamlit as st 
import sentry_sdk

from rhdzmota.support.frontend.views.main import view


if __name__ == "__main__":
    if (sentry_dns := os.environ.get("SENTRY_SDK_DNS")):
        sentry_sdk.init(
            dsn=sentry_dns,
            traces_sample_rate=1.0,  # 1.0 is equivalent to capturing 100% of transactions for performance monitoring
            profiles_sample_rate=1.0, # 1.0 is equivalent to profiling 100% of sampled transactions 
        )

    st.set_page_config(page_icon="./favicon.png", layout="wide")
    view()
