import sqlite3

def patch():
    try:
        conn = sqlite3.connect('placetrack.db')
        c = conn.cursor()
        try:
            c.execute('ALTER TABLE users ADD COLUMN profile_image VARCHAR(2048);')
            print("Added profile_image to users")
        except sqlite3.OperationalError as e:
            print(f"users: {e}")
            
        try:
            c.execute('ALTER TABLE students ADD COLUMN profile_image VARCHAR(2048);')
            print("Added profile_image to students")
        except sqlite3.OperationalError as e:
            print(f"students: {e}")
            
        conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    patch()
