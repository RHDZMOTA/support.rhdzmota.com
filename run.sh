(
    python -m pip install -e rhdzmota_support;
    cd rhdzmota_support/src/main/streamlit_entrypoint;
    python build_pages.py build_all;
    streamlit run Support.py
)
