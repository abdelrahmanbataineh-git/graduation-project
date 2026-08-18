import os
import httpx
from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Create a custom HTTP client with HTTP/2 disabled and single keep-alive connection
# to completely eliminate intermittent "ConnectionTerminated" / "[WinError 10035]" errors on Windows.
http_client = httpx.Client(
    http2=False,
    limits=httpx.Limits(max_keepalive_connections=1, max_connections=10),
    timeout=15.0
)

# Initialize Supabase client with our custom http_client options
options = ClientOptions(httpx_client=http_client)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY, options=options)