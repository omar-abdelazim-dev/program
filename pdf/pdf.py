import os
from fpdf import FPDF

class PremiumDeck(FPDF):
    def header(self):
        # Premium dark background for every slide (Deep Navy #15141E)
        self.set_fill_color(21, 20, 30)
        self.rect(0, 0, 297, 210, 'F')
        
    def add_glass_card(self, x, y, w, h):
        # Simulating a glassmorphic card (#1F1E2C)
        self.set_fill_color(31, 30, 44)
        self.rect(x, y, w, h, 'F')

# Initialize 16:9 Landscape PDF
pdf = PremiumDeck(orientation='L', unit='mm', format=(297, 210))
pdf.set_auto_page_break(auto=True, margin=15)

# ---------------------------------------------------------
# Slide 1: Cover
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 36)
pdf.set_text_color(255, 255, 255)
pdf.set_y(90)
pdf.cell(0, 15, 'Redefining the Future of Learning', 0, 1, 'C')
pdf.set_font('Arial', '', 16)
pdf.set_text_color(249, 115, 22) # Orange Accent
pdf.cell(0, 10, 'Built by Students. Powered by Purpose.', 0, 1, 'C')

# ---------------------------------------------------------
# Slide 2: Our Story
# ---------------------------------------------------------
pdf.add_page()
pdf.add_glass_card(20, 40, 257, 130)
pdf.set_font('Arial', 'B', 28)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(35, 60)
pdf.cell(0, 15, 'What if learning was built differently?', 0, 1, 'L')

pdf.set_font('Arial', '', 14)
pdf.set_text_color(200, 200, 200)
story_text = (
    "Education was never meant to be one-size-fits-all.\n"
    "For too long, learning has revolved around passing exams instead of building real-world skills.\n\n"
    "We created Program because we believed students and educators deserved something better.\n\n"
    "Built by students.\nBuilt for everyone."
)
pdf.set_xy(35, 85)
pdf.multi_cell(200, 8, story_text)

# ---------------------------------------------------------
# Slide 3: Why Program
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 28)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 25)
pdf.cell(0, 15, 'Why Program', 0, 1, 'C')

# Cards
pdf.add_glass_card(20, 60, 80, 100)
pdf.add_glass_card(108, 60, 80, 100)
pdf.add_glass_card(196, 60, 80, 100)

pdf.set_text_color(249, 115, 22)
pdf.set_font('Arial', 'B', 16)
pdf.set_xy(25, 75)
pdf.cell(70, 10, 'Academic Learning', 0, 1, 'C')
pdf.set_xy(113, 75)
pdf.cell(70, 10, 'Professional Skills', 0, 1, 'C')
pdf.set_xy(201, 75)
pdf.cell(70, 10, 'Career Growth', 0, 1, 'C')

# ---------------------------------------------------------
# Slide 4: Instructor Dashboard
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 24)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 20)
pdf.cell(80, 15, 'The Command Center', 0, 1, 'L')
pdf.set_font('Arial', '', 12)
pdf.set_text_color(200, 200, 200)
pdf.set_xy(20, 40)
pdf.multi_cell(80, 7, "Monitor courses, track student activity, review analytics, and manage content from one unified dashboard designed for ultimate efficiency.")

img_path = "Screenshot 2026-07-26 164449_2.png"
if os.path.exists(img_path):
    pdf.image(img_path, 110, 40, 170)

# ---------------------------------------------------------
# Slide 5: Course Creation & Management
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 24)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 20)
pdf.cell(80, 15, 'Course Management', 0, 1, 'L')
pdf.set_font('Arial', '', 12)
pdf.set_text_color(200, 200, 200)
pdf.set_xy(20, 40)
pdf.multi_cell(80, 7, "Create and organize courses effortlessly. Manage chapters, lessons, pricing, and resources. Everything is designed to simplify teaching.")

img1 = "Screenshot 2026-07-26 164103_2.png"
img2 = "Screenshot 2026-07-26 164459_2.png"
if os.path.exists(img1):
    pdf.image(img1, 110, 30, 140)
if os.path.exists(img2):
    pdf.image(img2, 140, 80, 140) # Overlapping for premium feel

# ---------------------------------------------------------
# Slide 6: Student Management
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 24)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 20)
pdf.cell(80, 15, 'Student Engagement', 0, 1, 'L')
pdf.set_font('Arial', '', 12)
pdf.set_text_color(200, 200, 200)
pdf.set_xy(20, 40)
pdf.multi_cell(80, 7, "Monitor every learner's journey. Identify struggling students, answer questions, and broadcast announcements seamlessly.")

img3 = "Screenshot 2026-07-26 164122_2.png"
img4 = "Screenshot 2026-07-26 164114_2.png"
if os.path.exists(img3):
    pdf.image(img3, 110, 25, 150)
if os.path.exists(img4):
    pdf.image(img4, 130, 105, 150)

# ---------------------------------------------------------
# Slide 7: Analytics
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 24)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 20)
pdf.cell(80, 15, 'Data-Driven Insights', 0, 1, 'L')
pdf.set_font('Arial', '', 12)
pdf.set_text_color(200, 200, 200)
pdf.set_xy(20, 40)
pdf.multi_cell(80, 7, "Understand how students interact with your content. Track engagement, completion rates, and feedback to improve outcomes.")

img5 = "Screenshot 2026-07-26 164154_2.png"
img6 = "Screenshot 2026-07-26 164132_2.png"
if os.path.exists(img5):
    pdf.image(img5, 110, 25, 150)
if os.path.exists(img6):
    pdf.image(img6, 130, 105, 150)

# ---------------------------------------------------------
# Slide 8: Payments / Revenue
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 24)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 20)
pdf.cell(80, 15, 'Financial Control', 0, 1, 'L')
pdf.set_font('Arial', '', 12)
pdf.set_text_color(200, 200, 200)
pdf.set_xy(20, 40)
pdf.multi_cell(80, 7, "Monitor earnings, track transactions, view revenue insights, and request payouts from one elegant dashboard.")

img7 = "Screenshot 2026-07-26 164205_2.png"
if os.path.exists(img7):
    pdf.image(img7, 110, 40, 170)

# ---------------------------------------------------------
# Slide 9: Why Educators Choose Program
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 28)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 25)
pdf.cell(0, 15, 'Why Educators Choose Us', 0, 1, 'C')

benefits = [
    "Save Time", "Understand Students Better", 
    "Everything in One Platform", "Professional Learning Experience", 
    "Easy Course Management", "Data-Driven Decisions"
]

x_start = 30
y_start = 60
for i, benefit in enumerate(benefits):
    col = i % 3
    row = i // 3
    pdf.add_glass_card(x_start + (col * 80), y_start + (row * 60), 75, 50)
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(249, 115, 22)
    pdf.set_xy(x_start + (col * 80), y_start + (row * 60) + 20)
    pdf.cell(75, 10, benefit, 0, 1, 'C')
# ---------------------------------------------------------
# Slide 10: Looking Ahead
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 28)
pdf.set_text_color(255, 255, 255)
pdf.set_xy(20, 25)
pdf.cell(0, 15, 'Looking Ahead', 0, 1, 'C')

pdf.set_font('Arial', '', 16)
pdf.set_text_color(200, 200, 200)

# FIX: Replaced the '•' characters with standard hyphens '-'
roadmap = [
    "- AI Assistant", "- Live Classes", "- Mobile App",
    "- Parent & School Dashboards", "- Communities & Gamification", "- Career Services"
]

pdf.set_xy(100, 60)
for item in roadmap:
    pdf.cell(0, 12, item, 0, 1, 'L')
    
# ---------------------------------------------------------
# Slide 11: Closing
# ---------------------------------------------------------
pdf.add_page()
pdf.set_font('Arial', 'B', 32)
pdf.set_text_color(255, 255, 255)
pdf.set_y(80)
pdf.cell(0, 15, 'More than a platform.', 0, 1, 'C')
pdf.cell(0, 15, 'A better way to learn.', 0, 1, 'C')

pdf.set_font('Arial', '', 16)
pdf.set_text_color(249, 115, 22)
pdf.set_y(120)
pdf.cell(0, 10, 'Built by Students. Powered by Purpose.', 0, 1, 'C')

# Save PDF
pdf.output('Program_Premium_Deck.pdf')
print("Presentation generated successfully: Program_Premium_Deck.pdf")