<a name="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/jovenlab/full-stack-rizal">
    <img src="" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">RizalGPT: Converse with the National Hero</h3>

  <p align="center">
    An AI-powered platform to chat with Dr. José Rizal, explore his works, and learn Philippine history interactively!
    <br/>
    <br/>
    <br/>
  </p>
</div>

---

## About The Project

**RizalGPT** is an educational chatbot that lets users converse with Dr. José Rizal, the Philippine national hero. 
It uses AI to simulate Rizal's personality, knowledge, and wit, providing a unique way to learn about his life, works, and the historical context of his time.

### Core Concepts Demonstrated

- AI-powered, in-character chat with José Rizal (knowledge up to 1896)
- User authentication and session-based chat history
- Modern, responsive UI with Next.js (React)
- RESTful backend with Django and Django REST Framework
- Secure JWT-based authentication

---

## Features

### AI Chat with Rizal
- Ask questions about Rizal's life, works, and Philippine history
- Receive answers in Rizal's unique voice and perspective
- Session-based chat: revisit and organize your conversations

### User Authentication
- Register and log in to save your chat sessions
- Secure JWT-based login

### Chat History & Management
- View, rename, and delete past chat sessions
- Each session keeps a full message history

### Responsive UI
- Clean, modern interface built with Next.js and Tailwind CSS
- Works on desktop and mobile

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

### Built With

* [![Django][Django]][Django-url]
* [![SQLite][SQLite]][SQLite-url]
* [![CSS3][CSS3]][CSS3-url]
* [![TailwindCSS][TailwindCSS]][TailwindCSS-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

You'll need the following installed on your system:

- Python 3.10+
- Node.js 18+
- npm (comes with Node.js)

If you don't have Node.js and npm installed, you can install them by running:
  ```sh
  npm install npm@latest -g
  ```
Make sure you have Python and Django installed on your system. You can install Django with:
  ```sh
  pip install django
  ```

### Installation

1. Clone the Repository
   ```sh
   git clone https://github.com//jovenlab/full-stack-rizal.git
   ```
2. Set up the Frontend (Next.js)
   ```sh
   cd rizal-chatbot
   npm install
   npm run dev
   ```
   The app should now be running at http://localhost:3000.

3. Set up the Backend (Django)
   ```sh
   cd ../backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser  # optional
   python manage.py runserver
   ```
   The Django app should now be running at http://127.0.0.1:8000.

4. Connect Frontend with Backend
   - Ensure the frontend is configured to use the correct API endpoint (e.g., http://127.0.0.1:8000/api).

5. Change git remote url to avoid accidental pushes to base project
   ```sh
   git remote set-url origin github_username/repo_name
   git remote -v # confirm the changes
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---



### Top Contributors

Thanks to these amazing people for bringing **RizalGPT** to life!

<a href="https://github.com/jovenlab"><img src="https://avatars.githubusercontent.com/u/195850039?v=4" width="50px;" alt="Jovenlab" /></a>
<a href="https://github.com/cidmesa"><img src="https://avatars.githubusercontent.com/u/197786140?v=4" width="50px;" alt="Cidmesa" /></a>
<a href="https://github.com/larkhiya"><img src="https://avatars.githubusercontent.com/u/137350308?v=4" width="50px;" alt="Larkhiya" /></a>
<a href="https://github.com/alglenrey"><img src="https://avatars.githubusercontent.com/u/197783173?v=4&size=64" width="50px;" alt="al" /></a>
<a href="https://github.com/ethanny"><img src="https://avatars.githubusercontent.com/u/145535621?v=4" width="50px;" alt="Ethan" /></a>


<!-- Add more contributors as needed -->

---

## Contact

- **Joven Labiste** — [jplabiste@up.edu.ph](mailto:jplabiste@up.edu.ph)
- **Chriz Ian Mesa** — [cdmesa@up.edu.ph](mailto:cdmesa@up.edu.ph)
- **Raethan Supatan** — [rrsupatan@up.edu.ph](mailto:rrsupatan@up.edu.ph)
- **Larkhiya Johnnyl Wong** — [lcwong@up.edu.ph](mailto:lcwong@up.edu.ph)
- **Al Glenrey Tilacas** — [aatilacas@up.edu.ph](mailto:aatilacas@up.edu.ph)


<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[Django]: https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white
[Django-url]: https://www.djangoproject.com/
[CSS3]: https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white
[CSS3-url]: https://developer.mozilla.org/en-US/docs/Web/CSS
[SQLite]: https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white
[SQLite-url]: https://www.sqlite.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Next.js]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white
[Nextjs-url]: https://nextjs.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/

