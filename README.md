# React Authentication System with Supabase

A modern, Firebase-inspired authentication system built with React and Supabase. Features a beautiful, responsive design with sign-in, sign-up, password reset, and user dashboard functionality.

## Features

- 🔐 **Complete Authentication System**
  - User sign-up with email verification
  - Sign-in with email and password
  - Password reset functionality
  - Secure sign-out

- 🎨 **Modern UI/UX Design**
  - Firebase-inspired design language
  - Fully responsive for all devices
  - Smooth animations and transitions
  - Beautiful gradient backgrounds

- ⚡ **Built with Modern Technologies**
  - React 18 with Hooks
  - Supabase for backend services
  - Context API for state management
  - CSS3 with modern features

- 🛡️ **Security Features**
  - Environment variables for sensitive data
  - Input validation and error handling
  - Protected routes and authentication guards

## Project Structure

```
my-auth-app/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── AuthContainer/     # Main authentication container
│   │   ├── SignIn/           # Sign-in component
│   │   ├── SignUp/           # Sign-up component
│   │   └── Dashboard/        # User dashboard
│   ├── lib/
│   │   └── supabase.js       # Supabase configuration
│   ├── contexts/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── App.js                # Main app component
│   ├── App.css              # Global styles
│   └── index.js             # App entry point
├── .env                     # Environment variables
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API in your Supabase dashboard
3. Copy your project URL and anon key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace the placeholder values with your actual Supabase credentials.

### 4. Enable Authentication in Supabase

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your site URL (e.g., `http://localhost:3000` for development)
3. Enable email confirmations if desired
4. Set up any additional providers you want to use

### 5. Run the Application

```bash
npm start
```

The app will open at `http://localhost:3000`.

## Usage

### Sign Up
1. Click "Sign up" to create a new account
2. Fill in your full name, email, and password
3. Check your email for verification (if enabled)
4. Sign in with your credentials

### Sign In
1. Enter your email and password
2. Click "Sign in" to access your dashboard
3. Use "Forgot your password?" if you need to reset

### Dashboard
- View your account information
- Access various features (Analytics, Settings, Security, Support)
- Sign out when finished

## Customization

### Styling
- Modify CSS files in each component folder
- Update the gradient colors in `AuthContainer.css` and `Dashboard.css`
- Adjust the logo and branding elements

### Features
- Add new authentication providers in `AuthContext.jsx`
- Extend the dashboard with additional features
- Implement profile editing functionality

### Database
- Set up additional tables in Supabase for user profiles
- Add row-level security policies
- Configure email templates

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Dependencies

- `@supabase/supabase-js` - Supabase client library
- `react` - React library
- `react-dom` - React DOM rendering
- `react-router-dom` - Client-side routing (if needed for expansion)
- `react-scripts` - Create React App scripts

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the component code for implementation details
3. Check browser console for error messages
4. Ensure environment variables are properly set

---

Built with ❤️ using React and Supabase