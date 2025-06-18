import React from 'react';

// Define the shape of props for policy pages
interface PolicyPageProps {
  onGoBack: () => void; // Callback to navigate back to the home page
}

/**
 * PrivacyPolicy component displays the privacy policy for the Naga Codex AI Chess application.
 * It is designed to be mobile-responsive and includes a button to navigate back to the game.
 */
const PrivacyPolicy: React.FC<PolicyPageProps> = ({ onGoBack }) => (
  <div className="policy-page bg-slate-800 text-white p-6 sm:p-8 rounded-lg shadow-xl max-w-full lg:max-w-4xl mx-auto my-4 sm:my-8 min-h-[70vh] flex flex-col items-center text-center">
    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-emerald-400 mb-6">Privacy Policy - Naga Codex AI Chess</h1>
    <div className="prose prose-invert max-w-full px-2 sm:px-0 text-left w-full lg:prose-xl">
      <p className="mb-4">Welcome to Naga Codex AI Chess! This Privacy Policy explains how we collect, use, and disclose information about you when you use our chess application.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">1. Information We Collect</h2>
      <p className="mb-4">We do not collect any personal identifying information from our users. Our application is designed to be used without requiring any user accounts or personal data input.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">2. How We Use Information</h2>
      <p className="mb-4">Since we do not collect personal information, we do not use it for any purpose. We utilize anonymous usage data (e.g., game session duration, features used) purely for internal analytics to improve game performance and user experience. This data cannot be traced back to individual users.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">3. Data Sharing and Disclosure</h2>
      <p className="mb-4">We do not share, sell, rent, or trade any information with third parties, as we do not collect personal data from you. Any analytics data we gather is aggregated and anonymized.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">4. Cookies</h2>
      <p className="mb-4">Our application uses essential cookies for game functionality (e.g., remembering your cookie preferences). For more details, please refer to our <a href="#" onClick={onGoBack} className="text-blue-400 hover:underline">Cookie Policy</a> (Clicking here will navigate you to the Cookie Policy page).</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">5. Changes to This Privacy Policy</h2>
      <p className="mb-4">We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

      <h2 className="text-2xl sm:text-3xl text-emerald-300 mt-6 mb-3">6. Contact Us</h2>
      <p className="mb-4">If you have any questions about this Privacy Policy, you can contact us:</p>
      <ul className="list-disc pl-5 mb-4 text-left mx-auto">
        <li><strong>Company:</strong> Naga Codex</li>
        <li><strong>Owner:</strong> Maurice Holda</li>
        <li><strong>Address:</strong> Hamburg 20355, Germany</li>
        <li><strong>Email:</strong> chosenfewrecords@hotmail.de</li>
      </ul>
    </div>
    <button
      onClick={onGoBack}
      className="mt-8 px-6 py-3 bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75"
    >
      Go Back to Game
    </button>
  </div>
);

export default PrivacyPolicy;
