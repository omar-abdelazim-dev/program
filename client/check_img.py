from PIL import Image
img = Image.open(r'C:\Users\ahmad\.gemini\antigravity\brain\tempmediaStorage\media__1785661614288.png')
print("Format:", img.format, "Size:", img.size, "Mode:", img.mode)
pixels = img.load()
print("Top-left:", pixels[0, 0])
print("Middle of DEVELOPMENT box:", pixels[50, img.size[1]//2])
print("Middle of background between boxes:", pixels[img.size[0]//2, img.size[1]//2])
