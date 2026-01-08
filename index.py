import streamlit as st

st.title("Minha App com Anúncios Google AdSense")

st.markdown("""
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-app-pub-7218010744811775/6344763448"
     data-ad-slot="YYYYYYYYYYYYYYYY"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
""", unsafe_allow_html=True)