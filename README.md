🚀Annotation Ops Task Manager
A professional, full-stack Task Management System specifically engineered for high-density image captioning, visual grounding, and LLM post-training workflows (RLHF/SFT).

🌐 Live Demo: https://ethara-frontend-fhvi.onrender.com

(Note: Hosted on Render's Free Tier. Please allow 30-60 seconds for the backend to wake up on the first load.)

🛠️ The Professional Stack
Built with the MERN stack to ensure high performance, data persistence, and real-time updates.

Frontend: React.js + Vite (Tailwind CSS for professional dark-purple & white UI).

Backend: Node.js + Express.js (RESTful API architecture).

Database: MongoDB Atlas (Cloud-hosted NoSQL for annotation data persistence).

Security: JWT-based authentication with protected routes for Admin and Member roles.

🌟 Key Features
👨‍💼 Admin Suite
Batch Task Deployment: Create projects with specific titles, AHT (Average Handle Time) targets, and complexity levels.

Smart Assignment: Multi-select assignee dropdown with "Select All" functionality for rapid team distribution.

QC Review Loop: A dedicated interface to review "Proof of Work" submissions. Admins can approve or reject tasks with granular feedback.

🧑‍💻 Member Workspace
Productivity Tracking: Real-time Daily Target Progress Bar to visualize performance against goals.

Active Timer: Integrated task timers to monitor handle times accurately during the annotation process.

Proof of Work: Mandatory submission of work evidence to ensure data integrity.

Feedback Integration: Direct visibility of Admin comments to facilitate rapid "Macro-to-Micro" corrections.

🏛️ Architecture & Methodology
This project mirrors the internal operating procedures at Ethara AI. It moves beyond simple task tracking by incorporating:

Complexity Scaling: Acknowledging that not all annotation tasks are equal.

Accountability: Proof-of-work requirements to prevent "shortcuts."

The Elimination Ladder: A feedback system designed to refine annotations from general descriptions to precise, visually grounded captions.

🚀 Deployment Note
Originally architected for Railway, the project was successfully migrated to Render to ensure 100% uptime and accessibility for this assessment. The environment uses cloud-neutral variables, allowing for seamless scalability.

📥 Local Setup
git clone https://github.com/Thoibasaleem/task-manager.git

cd backend && npm install && npm start

cd frontend && npm install && npm run dev

Configure .env with your MONGODB_URI and JWT_SECRET.

Developed by Thoiba M
LLM Post-Training Intern | Ethara AI
