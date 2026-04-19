import re
path = r"d:\Codecatalyst\frontend\src\App.css"

with open(path, "rb") as f:
    data = f.read()

# We want to find the valid content that ends normally before the botched PowerShell echo.
# The valid content ends with the media query:
valid_end = b"  .profile-page {\r\n    max-width: 100%;\r\n  }\r\n}\r\n"
idx = data.find(valid_end)

if idx != -1:
    clean_data = data[:idx + len(valid_end)]
    
    # Append the correct CSS payload
    correct_css = b"""
/* Profile Image Avatar Styles */
.profile-image-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-avatar-upload {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.2s ease;
  border-radius: 50%;
  font-size: 1.5rem;
}
.profile-hero__avatar:hover .profile-avatar-upload {
  opacity: 1;
}
.profile-hero__avatar {
  position: relative;
  overflow: hidden;
}
"""
    
    with open(path, "wb") as w:
        w.write(clean_data + correct_css)
    print("Fixed App.css successfully.")
else:
    # also try '\n' instead of '\r\n'
    valid_end = b"  .profile-page {\n    max-width: 100%;\n  }\n}\n"
    idx = data.find(valid_end)
    if idx != -1:
        clean_data = data[:idx + len(valid_end)]
        correct_css = b"\n/* Profile Image Avatar Styles */\n.profile-image-img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.profile-avatar-upload {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(0, 0, 0, 0.5);\n  color: white;\n  opacity: 0;\n  cursor: pointer;\n  transition: opacity 0.2s ease;\n  border-radius: 50%;\n  font-size: 1.5rem;\n}\n.profile-hero__avatar:hover .profile-avatar-upload {\n  opacity: 1;\n}\n.profile-hero__avatar {\n  position: relative;\n  overflow: hidden;\n}\n"
        with open(path, "wb") as w:
            w.write(clean_data + correct_css)
        print("Fixed App.css successfully (LF).")
    else:
        print("Could not find the valid end marker in the file.")
