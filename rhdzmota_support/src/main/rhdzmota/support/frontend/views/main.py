import textwrap

import streamlit as st


def view():
    st.markdown(
        textwrap.dedent(
            f"""
            # Welcome :wave:

            This is a simpe support portal designed by [Rodrigo H. Mota](https://rhdzmota.com) using [streamlit](https://streamlit.io/).
            """
        )
    )
