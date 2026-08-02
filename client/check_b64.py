import base64

def get_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read(100)).decode('utf-8')

print("logo-dark:", get_b64("src/assets/logo-dark.png"))
print("logo-light:", get_b64("src/assets/logo-light.png"))
