# **Overview**

This project is a **Flask-based single-page weather dashboard** that displays real-time weather and forecast data for cities selected by the user. It’s built using **Python (Flask)** for the backend and **HTML, CSS, and JavaScript (AJAX)** for dynamic frontend updates. Favorite cities are stored in browser cookies, keeping the system lightweight and easy to maintain.

---

## **Features**

- Real-time weather and forecast data powered by the **Google Weather API**  
- **City search** with live, dynamic result updates  
- **Add or remove favorites** using cookie-based storage  
- **Responsive and simple interface** that works across devices  
- **Secure OAuth2 token-based authentication** for user sessions  
- **Modular Flask structure** for easier development, testing, and scaling  

---

## **Setup**

1. **Clone the repository:**

   ```bash
   git clone https://github.com/<your-username>/weather_dashboard.git
   cd weather_dashboard
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure your API key:**
   Add your **Google API key** to `.env`

4. **Run the application:**

   ```bash
   flask run
   ```
