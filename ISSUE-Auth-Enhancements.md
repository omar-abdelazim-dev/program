# Issue: Auth Page & Role Registration Enhancements

**Status:** Completed ✔️

## What We Have Done
- **CSS Variable Optimization**: Refactored duplicated CSS colors and hardcoded styles across the entire project (`LearningPortal`, `AuthPage`, `AdminPortal`, etc.) into central, dynamic CSS variables.
- **Glassmorphism Auth Cards**: Streamlined the Student/Instructor role selection cards in the Auth page with frosted glass styling and smooth transitions to seamlessly match the rest of the application.
- **Dynamic Multi-Step Layout**: Overhauled the multi-step registration layout. Instructors now only have a targeted 2-step process without the student 'Vision' step.
- **Role-Specific Fields**: Added new Instructor-specific inputs: 'Courses provided', 'LinkedIn Profile', and 'Other Social / Website', while dynamically hiding the student-specific inputs for them.
- **Dynamic Step Indicators**: Fixed the alignment and spacing of the step progress indicator, stripping out hardcoded widths to make it perfectly stretch and dynamically center for both 2-step and 3-step layouts. 
- **Gradient Fades**: Added an elegant gradient fade to the step progress lines.
- **Early Email Validation**: Implemented an early backend email validation check (`/api/auth/check-email`) that catches duplicate emails seamlessly on step 1 of the registration process before the user wastes time filling out the rest of the form.
- **End-to-End Data Binding**: Wired all the new frontend fields (College, Track, LinkedIn, Courses, etc.) directly to the backend payload and updated the Mongoose `User` schema so all data is now permanently saved into the database upon registration.
- **Auth UI Polish**: Matched the theme toggle button in the auth pages to the core app's unbordered, clean styling. Fixed padding overlap issues between text and icons in custom inputs. Corrected the login button loading state to display "Signing in..." instead of "Creating account...". Fixed a CSS conflict that caused a weird border around the button's loading spinner.
- **Notification Improvements**: Restored the missing notification dropdown in the Student layout. Added a "Clear all" button to easily dismiss all notifications. Improved the dropdown UX with smooth fade-in animations and an invisible hover-bridge to ensure the menu doesn't disappear when the user's mouse travels towards it.
## Next Steps / What We Are Doing
- *[Track next steps here]*
