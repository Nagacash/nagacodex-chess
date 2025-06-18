import React from 'react';

// Define the shape of props for policy pages
interface PolicyPageProps {
  onGoBack: () => void; // Callback to navigate back to the home page
}

/**
 * CookiePolicy component displays the cookie policy for the Naga Codex AI Chess application.
 * It is designed to be mobile-responsive and includes a button to navigate back to the game.
 */
const CookiePolicy: React.FC<PolicyPageProps> = ({ onGoBack }) => (
  <div className="policy-page bg-slate-800 text-white p-6 sm:p-8 rounded-lg shadow-xl max-w-full lg:max-w-4xl mx-auto my-4 sm:my-8 min-h-[70vh] flex flex-col items-center text-center">
    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-emerald-400 mb-6">Cookie Policy - Naga Codex AI Chess</h1>
    <div className="prose prose-invert max-w-full px-2 sm:px-0 text-left w-full lg:prose-xl">
      <p className="mb-4">This Cookie Policy explains how Naga Codex AI Chess ("we", "us", "our") uses cookies and similar technologies when you visit our application.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">1. What are Cookies?</h2>
      <p className="mb-4">Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work or to work more efficiently, as well as to provide reporting information.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">2. How We Use Cookies</h2>
      <p className="mb-4">We use cookies primarily for:
        <ul className="list-disc pl-5 mt-2">
          <li><strong>Essential Functionality:</strong> To remember your cookie preferences (e.g., whether you have accepted or rejected our cookie policy). This prevents the cookie banner from reappearing on every visit once you've made a choice.</li>
          <li><strong>Anonymous Analytics:</strong> We may use aggregated, anonymized data collected via cookies to understand how our game is used (e.g., popular features, game session length). This data does not identify you personally.</li>
        </ul>
      </p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">3. Types of Cookies Used</h2>
      <p className="mb-4">We use "first-party cookies" which are set by our application. Specifically:</p>
      <ul className="list-disc pl-5 mt-2">
        <li>`cookiesAccepted`: This cookie stores your preference regarding our cookie policy (true/false). It helps us determine whether to display the cookie banner.</li>
      </ul>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">4. Your Choices Regarding Cookies</h2>
      <p className="mb-4">You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking the "Accept All" or "Reject All" buttons on our cookie banner. If you choose to reject cookies, the `cookiesAccepted` preference will be stored to prevent the banner from reappearing, but no other non-essential cookies will be set or utilized.</p>
      <p className="mb-4">Most web browsers allow you to control cookies through their settings. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience as it will no longer be personalized to you.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">5. Changes to This Cookie Policy</h2>
      <p className="mb-4">We may update our Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">6. Contact Us</h2>
      <p className="mb-4">If you have any questions about our use of cookies or other technologies, please email us at: chosenfewrecords@hotmail.de</p>
    </div>
    <button
      onClick={onGoBack}
      className="mt-8 px-6 py-3 bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75"
    >
      Go Back to Game
    </button>
  </div>
);

export default CookiePolicy;
