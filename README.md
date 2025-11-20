# FLHS Hub - Faculty Portal

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Status](https://img.shields.io/badge/status-Active-success.svg)

**A comprehensive faculty management system designed and developed for Fort Lauderdale High School**

[Features](#-key-features) • [Tech Stack](#-technology-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation)

</div>

---

## 🎓 Project Overview

**FLHS Hub** is a modern, full-stack web application built specifically for Fort Lauderdale High School's faculty management needs. This project represents a complete digital transformation of traditional classroom management tools, providing teachers with an intuitive, efficient, and professional platform for daily operations.

### 🏆 Project Significance

This is my **master project** - a comprehensive demonstration of full-stack development skills, modern web technologies, and practical problem-solving in an educational environment. As my intellectual property, this project showcases advanced proficiency in:

- **Frontend Development** with React 19 and Next.js 15
- **Modern UI/UX Design** with Tailwind CSS and Shadcn/ui
- **TypeScript** for type-safe development
- **Responsive Design** and accessibility standards
- **Professional Software Architecture**

## ✨ Key Features

### 📊 **Dashboard Analytics**
- Real-time classroom statistics
- Interactive KPI cards with hover effects
- Time-based metrics (Today, Week)
- Visual data representation

### 🛠️ **Faculty Tools Suite**
- **Tardy Log** - Record and track late students with professional barcode scanning
- **Barcode Scanner** - Professional scanning with ZXing library, red scanning line, and real-time detection
- **Hall Pass** - Digital timed passes system
- **Student Locator** - Find students across campus
- **Detentions** - Track attendance and disciplinary actions
- **Positive Points** - Reward system for good behavior
- **Student History** - Comprehensive student records with advanced search
- **IT Help** - Technical support request system
- **Lost Device** - Device tracking and recovery
- **Room Finder** - Campus resource locator

### 📷 **Professional Barcode Scanner**
- **ZXing Integration** - Industry-standard barcode detection library
- **Red Scanning Line** - Professional animated scanning line with corner brackets
- **Real-time Detection** - Instant barcode recognition and student ID extraction
- **Camera Controls** - Switch between front/back cameras
- **Success Feedback** - Visual and haptic feedback on successful scans
- **Smart Parsing** - Automatically extracts 10-digit student IDs from any barcode format
- **Reusable Component** - Consistent scanning experience across all apps

### 🎨 **Design Excellence**
- **School Branding** - Royal blue, white, gray color scheme
- **Glassmorphism UI** - Modern, professional aesthetic
- **Responsive Design** - Optimized for all devices
- **Accessibility** - WCAG AA compliant
- **Smooth Animations** - Polished user interactions

## 🚀 Technology Stack

<div align="center">

### **Core Technologies**

![Next.js](https://img.shields.io/badge/Next.js-15.5.6-000000?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)

### **Libraries & Tools**

![Firebase](https://img.shields.io/badge/Firebase-12.4.0-FFCA28?style=for-the-badge&logo=firebase)
![Prisma](https://img.shields.io/badge/Prisma-6.18.0-2D3748?style=for-the-badge&logo=prisma)
![ZXing](https://img.shields.io/badge/ZXing-0.21.3-000000?style=for-the-badge)
![Clerk](https://img.shields.io/badge/Clerk-6.33.7-000000?style=for-the-badge)

</div>

### **Frontend**
- **Next.js 15.5.6** - React framework with App Router
- **React 19.1.0** - Latest React features
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Shadcn/ui** - Modern component library
- **Framer Motion** - Smooth animations and transitions

### **Backend & Database**
- **Firebase** - Real-time database and authentication
- **Prisma** - Modern database ORM
- **SQLite** - Local database support

### **Key Libraries**
- **@zxing/library** - Professional barcode scanning
- **@clerk/nextjs** - Authentication system
- **next-themes** - Dark/light mode support
- **Lucide React** - Beautiful icon library

### **Development Tools**
- **ESLint** - Code quality and consistency
- **Turbopack** - Fast development builds
- **TypeScript** - Type-safe development

### **Design System**
- **Custom CSS Variables** - Consistent theming
- **Gradient Backgrounds** - Dynamic visual effects
- **Glass Morphism** - Modern UI patterns
- **Responsive Grid** - Mobile-first design

## 📁 Project Structure

```
flhs-hub/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── globals.css           # Global styles and themes
│   │   ├── layout.tsx            # Root layout component
│   │   ├── page.tsx              # Homepage dashboard
│   │   ├── tardy/                # Tardy logging features
│   │   │   ├── page.tsx          # Main tardy log page
│   │   │   └── scan/             # Barcode scanning pages
│   │   ├── history/              # Student history
│   │   ├── points/               # Positive points system
│   │   └── [other routes]/       # Additional feature pages
│   ├── components/               # Reusable UI components
│   │   ├── SiteHeader.tsx        # Navigation header
│   │   ├── AppTile.tsx           # Feature tiles
│   │   ├── BarcodeScanner.tsx    # Professional barcode scanner
│   │   ├── LiveScanCard.tsx      # Live scanning interface
│   │   ├── DashboardHeader.tsx   # Dashboard header component
│   │   └── ui/                   # Shadcn/ui components
│   └── lib/                      # Utility functions
│       ├── firebase.ts           # Firebase configuration
│       ├── utils.ts              # General utilities
│       └── studentService.ts     # Student data service
├── docs/                         # Documentation and assets
│   ├── PROJECT_REPORT.md         # Technical documentation
│   ├── FIREBASE_SETUP.md         # Firebase setup guide
│   └── PROJECT PHOTOS/           # Project screenshots
├── scripts/                      # Build and deployment scripts
│   ├── quick-push.sh             # Git push script
│   └── start-dev.sh              # Development startup script
├── public/                       # Static assets
│   └── images/                   # SVG icons and images
├── components.json               # Shadcn/ui configuration
├── tailwind.config.ts            # Tailwind configuration
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
└── README.md                     # Project documentation
```

## 🎯 Development Philosophy

### **Educational Focus**
This project was designed with real-world educational needs in mind, addressing common pain points in faculty management:

- **Efficiency** - Streamlined workflows for busy teachers
- **Accessibility** - Inclusive design for all users
- **Scalability** - Built to grow with school needs
- **Maintainability** - Clean, documented code

### **Technical Excellence**
- **Modern Standards** - Latest web technologies and best practices
- **Performance** - Optimized for speed and responsiveness
- **Security** - Built-in authentication and data protection
- **Code Quality** - Comprehensive linting and type checking

## 🚀 Getting Started

### **Prerequisites**
- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **Git** for version control
- **Firebase Account** (for database features)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/rjrmt/flhs-help.git
   cd flhs-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   cp .env.example .env.local
   
   # Add your Firebase and Clerk credentials
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

### **Available Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality |

### **Project Setup**

For detailed setup instructions, including Firebase configuration, see the [Firebase Setup Guide](./FIREBASE_SETUP.md).

## 📈 Development Roadmap

### **Phase 1: Core Features** ✅
- [x] Dashboard implementation
- [x] Faculty tools suite
- [x] Responsive design
- [x] School branding
- [x] Professional barcode scanner
- [x] Firebase integration
- [x] Student history system
- [x] Real-time data updates

### **Phase 2: Enhanced Functionality** 🚧
- [x] Barcode scanning with ZXing
- [x] Student database integration
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Batch scanning mode
- [ ] Export/import functionality

### **Phase 3: School Integration** 📋
- [ ] School system integration (SIS)
- [ ] Multi-user support with roles
- [ ] Admin dashboard
- [ ] Comprehensive reporting system
- [ ] Mobile app development
- [ ] Offline mode support

## 📝 Recent Updates

### **Latest Features (2025)**
- ✨ Professional barcode scanner with ZXing library integration
- 🎨 Red scanning line animation with corner brackets
- 🔄 Reusable BarcodeScanner component for all apps
- 📱 Enhanced mobile responsiveness
- 🎯 Improved student ID extraction from barcodes
- 🔔 Success animations and haptic feedback
- 📊 Enhanced dashboard with real-time data

## 👨‍💻 Developer

**Developed by:** RJ Ramautar  
**Institution:** Fort Lauderdale High School  
**Project Type:** Master Project - Intellectual Property  
**Development Period:** October 2025 - Present  
**Repository:** [github.com/rjrmt/flhs-help](https://github.com/rjrmt/flhs-help)  

## 📚 Documentation

- **[Firebase Setup Guide](./FIREBASE_SETUP.md)** - Complete Firebase configuration instructions
- **[Roster Management](./ROSTER_MANAGEMENT.md)** - Student roster management documentation
- **[Project Report](./docs/PROJECT_REPORT.md)** - Detailed technical documentation

## 🔒 License

This project is my intellectual property and is developed for educational purposes at Fort Lauderdale High School. All rights reserved.

## 🤝 Contributing

This is a personal master project. For collaboration or feature requests, please contact the developer directly.

## 🙏 Acknowledgments

- **Fort Lauderdale High School** - For providing the opportunity to develop this project
- **Next.js Team** - For the amazing framework
- **Shadcn** - For the beautiful UI components
- **ZXing Project** - For the barcode scanning library

---

<div align="center">

**Built with ❤️ for Fort Lauderdale High School Faculty**

*This project represents the culmination of modern web development skills applied to solve real-world educational challenges.*

[⬆ Back to Top](#flhs-hub---faculty-portal)

</div>
