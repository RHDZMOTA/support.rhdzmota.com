import streamlit as st 
from rhdzmota.support.frontend.views.main import view


if __name__ == "__main__":
    st.set_page_config(page_icon="./favicon.png", layout="wide")
    view()
