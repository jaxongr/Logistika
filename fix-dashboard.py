import sys

# Bu faylni o'qish
with open('src/bot/bot.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Eski va yangi kod
old_line = '              driver: null, // faol buyurtmalarda haydovchi tayinlanmagan'
new_lines = '''              driver: null, // faol buyurtmalarda haydovchi tayinlanmagan
              route: `${cargo.fromCity} → ${cargo.toCity}`,
              cargoType: cargo.cargoType,
              amount: cargo.price,'''

# Almashtirish
if old_line in content:
    content = content.replace(old_line, new_lines)
    print("Dashboard mapping fixed")
else:
    print("Target line not found")

# Faylga yozish
with open('src/bot/bot.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
