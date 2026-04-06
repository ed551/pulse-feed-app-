import { useEffect } from "react";
import { FileText } from "lucide-react";
import { privacy_engine, auto_translation_engine } from "../lib/engines";

export default function Terms() {
  useEffect(() => {
    privacy_engine();
    auto_translation_engine();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-teal-600 dark:text-teal-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Terms & Conditions</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Last updated: April 2026</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 prose dark:prose-invert max-w-none">
        <div className="p-6 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800/50 mb-8">
          <h3 className="text-teal-800 dark:text-teal-300 font-bold mt-0">Comprehensive Global Service Agreement</h3>
          <p className="text-teal-700 dark:text-teal-400 mb-0 font-medium">
            Pulse Feeds is a multi-dimensional community ecosystem integrating advanced artificial intelligence, social networking, real-world problem solving, educational advancement, and a proprietary reward structure. This document is a legally binding contract that governs your access to and use of all Pulse Feeds platforms, services, and technologies.
          </p>
        </div>

        <h2>1. Introduction and Binding Agreement</h2>
        <p>
          Welcome to Pulse Feeds. These Terms & Conditions ("Terms") constitute a legally binding agreement between you, whether personally or on behalf of an entity ("you" or "User") and Pulse Feeds ("Company," "we," "us," or "our"), concerning your access to and use of the Pulse Feeds mobile application, website, and any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site" or the "App").
        </p>
        <p>
          By accessing the Site, you agree that you have read, understood, and agreed to be bound by all of these Terms. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.
        </p>
        <p>
          Pulse Feeds is a complex, multi-layered platform integrating social networking, artificial intelligence (AI), educational modules, community problem-solving (AI Eye), and a proprietary reward system. These Terms are designed to provide a comprehensive legal framework for all these interactions, ensuring a safe, transparent, and legally compliant environment for all users globally.
        </p>
        <p>
          Supplemental terms and conditions or documents that may be posted on the Site from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Terms at any time and for any reason. We will alert you about any changes by updating the "Last updated" date of these Terms, and you waive any right to receive specific notice of each such change. It is your responsibility to periodically review these Terms to stay informed of updates. You will be subject to, and will be deemed to have been made aware of and to have accepted, the changes in any revised Terms by your continued use of the Site after the date such revised Terms are posted.
        </p>
        <p>
          The information provided on the Site is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Site from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable.
        </p>

        <h2>2. Comprehensive Definitions</h2>
        <p>For the purposes of these Terms, the following definitions apply with absolute legal precision:</p>
        <ul>
          <li><strong>"Account"</strong> means a unique account created for You to access our Service or parts of our Service, including your profile, wallet, and educational progress.</li>
          <li><strong>"AI Engine"</strong> refers to the suite of artificial intelligence models integrated into the App, primarily powered by Gemini 3 Flash and other proprietary algorithms, used for content generation, problem analysis, educational personalization, and community moderation.</li>
          <li><strong>"Application"</strong> means the software program provided by the Company downloaded by You on any electronic device, named Pulse Feeds, including all updates, patches, and sub-modules.</li>
          <li><strong>"Contributions"</strong> refers to any content, including text, images, videos, audio, polls, and reports, that you upload, post, or otherwise make available on the platform.</li>
          <li><strong>"Education Hub"</strong> refers to the section of the Application dedicated to learning, including AI-generated courses, pre-defined curricula, and the associated reward structure.</li>
          <li><strong>"AI Eye"</strong> refers to the community reporting and analysis tool that utilizes AI to identify and categorize real-world problems.</li>
          <li><strong>"Pulse Points"</strong> refers to the virtual units of account used within the platform's reward system, which may be redeemed for financial value according to our specific redemption policies.</li>
          <li><strong>"Merchant of Record (MoR)"</strong> refers to the third-party entity responsible for processing financial transactions, managing tax compliance, and facilitating payouts to users.</li>
          <li><strong>"User"</strong> (also referred to as "You" or "Your") means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service.</li>
          <li><strong>"Content"</strong> means text, images, photos, audio, video, location data, and all other forms of data or communication.</li>
          <li><strong>"User Content"</strong> means Content that users submit or transmit to, through, or in connection with the Service.</li>
          <li><strong>"Company Content"</strong> means Content that we create and make available in connection with the Service.</li>
          <li><strong>"Third Party Content"</strong> means Content that originates from parties other than Pulse Feeds or its users, which is made available in connection with the Service.</li>
        </ul>

        <h2>3. Eligibility, Representations, and Warranties</h2>
        <h3>3.1 Age and Legal Capacity</h3>
        <p>
          The Service is intended for users who are at least 18 years old. Persons under the age of 18 are strictly prohibited from using or registering for the Service. By using the Service, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. If we become aware that a user is under 18, we reserve the right to terminate the account immediately without notice.
        </p>
        <h3>3.2 Global Compliance and Sanctions</h3>
        <p>
          You represent and warrant that: (i) you are not located in a country that is subject to a U.S. Government embargo, or that has been designated by the U.S. Government as a "terrorist supporting" country; and (ii) you are not listed on any U.S. Government list of prohibited or restricted parties. You further agree to comply with all local laws and regulations regarding online conduct and acceptable content in your jurisdiction.
        </p>
        <h3>3.3 Truthful and Accurate Information</h3>
        <p>
          By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms; (4) you are not a minor in the jurisdiction in which you reside; (5) you will not access the Site through automated or non-human means, whether through a bot, script or otherwise; (6) you will not use the Site for any illegal or unauthorized purpose; and (7) your use of the Site will not violate any applicable law or regulation.
        </p>
        <p>
          If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Site (or any portion thereof).
        </p>

        <h2>4. User Registration, Account Security, and Identity Verification</h2>
        <p>
          You may be required to register with the Site. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
        </p>
        <p>
          <strong>Identity Verification (KYC):</strong> To participate in the reward system and initiate withdrawals, you may be required to undergo a Know Your Customer (KYC) verification process. This may include providing government-issued identification, proof of address, and other documentation as required by our Merchant of Record or applicable financial regulations. Failure to complete KYC may result in the suspension of your withdrawal rights.
        </p>
        <p>
          You are responsible for all activities that occur under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account. We will not be liable for any loss or damage arising from your failure to comply with this section.
        </p>
        <p>
          Pulse Feeds reserves the right to monitor account activity for suspicious patterns. Accounts found to be engaging in multi-accounting, botting, or other fraudulent activities will be permanently banned, and all associated rewards will be forfeited.
        </p>

        <h2>5. Detailed Feature Terms and Operational Guidelines</h2>
        <h3>5.1 Social Interaction and Community Feeds</h3>
        <p>
          Pulse Feeds provides a platform for social interaction. You are solely responsible for the content you post and your interactions with other users.
        </p>
        <ul>
          <li><strong>Content Standards:</strong> All posts must adhere to our Community Guidelines, which prohibit hate speech, harassment, explicit content, and misinformation.</li>
          <li><strong>AI Moderation:</strong> Our AI Engine monitors feeds in real-time. Content flagged as violating our standards may be removed automatically or queued for human review.</li>
          <li><strong>User Disputes:</strong> While we provide tools for reporting, we are not responsible for resolving personal disputes between users.</li>
          <li><strong>Public Nature of Content:</strong> Most content you post on Pulse Feeds is public by default. You should be aware that any information you share may be read, collected, and used by others.</li>
        </ul>

        <h3>5.2 AI Eye: Real-World Problem Detection and Analysis</h3>
        <p>
          The AI Eye feature allows users to report community issues. Reports are analyzed by our AI Engine (Gemini 3 Flash).
        </p>
        <ul>
          <li><strong>Probabilistic Nature:</strong> You acknowledge that AI analysis is probabilistic. While we strive for accuracy, the AI may misinterpret data or provide incorrect categorizations.</li>
          <li><strong>No Guarantee of Resolution:</strong> Pulse Feeds is a platform for awareness and analysis. We do not guarantee that any reported issue will be resolved by local authorities or NGOs.</li>
          <li><strong>Data Sharing:</strong> By submitting a report, you consent to the sharing of anonymized report data with relevant third parties (e.g., community leaders, NGOs) to facilitate potential solutions.</li>
          <li><strong>Abuse of System:</strong> Submitting false, malicious, or repetitive reports is a breach of these Terms and may result in permanent account suspension.</li>
          <li><strong>Intellectual Property in Reports:</strong> You grant Pulse Feeds a worldwide, royalty-free license to use the data from your reports to improve our AI models and for public interest research.</li>
        </ul>

        <h3>5.3 Education Hub: AI-Driven Learning and Reward Structure</h3>
        <p>
          The Education Hub provides educational content, including AI-generated courses.
        </p>
        <ul>
          <li><strong>AI-Generated Curricula:</strong> Courses generated by AI are for informational and educational purposes only. We do not warrant the accuracy, completeness, or suitability of AI-generated content for any specific professional or academic purpose.</li>
          <li><strong>Learning Objectives:</strong> Completion of a course does not guarantee mastery or professional certification unless explicitly stated as an accredited program.</li>
          <li><strong>Reward Mechanism (Learn & Earn):</strong> For paid courses, a 75/25 revenue split applies. 75% of the course fee is retained by Pulse Feeds for platform maintenance and content development, while 25% is credited to the User's wallet as a "Learn & Earn" reward. This reward is subject to the monthly withdrawal cycle.</li>
          <li><strong>Badges:</strong> Digital badges awarded are proprietary to Pulse Feeds and represent internal milestones. They do not carry external academic credit.</li>
          <li><strong>Course Availability:</strong> We reserve the right to modify or remove courses at any time without prior notice.</li>
        </ul>

        <h3>5.4 Dating Hub: Social Connections and Safety</h3>
        <p>
          The Dating Hub is intended for personal social connections.
        </p>
        <ul>
          <li><strong>User Responsibility:</strong> You are solely responsible for your interactions. We do not conduct criminal background checks on users. We urge you to exercise caution and follow safety best practices when meeting individuals in person.</li>
          <li><strong>Prohibited Conduct:</strong> Deceptive profiles, catfishing, commercial solicitation, and harassment are strictly prohibited and will result in immediate termination.</li>
          <li><strong>Privacy:</strong> Information shared in the Dating Hub is visible to other users in that section. Do not share sensitive personal information (e.g., home address, financial details) in your public dating profile.</li>
          <li><strong>Matching Algorithms:</strong> Our matching algorithms are proprietary and provided "as is". We do not guarantee compatibility or successful relationships.</li>
        </ul>

        <h3>5.5 Watch-to-Earn: Media Consumption and Integrity</h3>
        <p>
          Users can earn rewards by watching curated media content.
        </p>
        <ul>
          <li><strong>Active Viewing:</strong> Rewards are only granted for active, uninterrupted viewing. Using bots, automated scripts, or backgrounding the app to simulate viewing is strictly prohibited.</li>
          <li><strong>Reward Calculation:</strong> The amount of Pulse Points earned per video is determined by our proprietary algorithms and may vary based on content type, duration, and advertiser demand.</li>
          <li><strong>Content Restrictions:</strong> We are not responsible for the content of third-party videos provided in the Watch-to-Earn section.</li>
        </ul>

        <h2>6. Reward System, Financial Provisions, and Tax Compliance</h2>
        <h3>6.1 Pulse Points and Redemption</h3>
        <p>
          Pulse Points are virtual units used to track engagement and rewards. They have no value outside the Pulse Feeds ecosystem. Redemption of points for financial value is a discretionary service provided by Pulse Feeds and is subject to change.
        </p>
        <h3>6.2 Monthly Withdrawal Cycle and Thresholds</h3>
        <p>
          To ensure financial integrity and prevent fraudulent activity, all withdrawal requests are processed in a single monthly batch.
        </p>
        <ul>
          <li><strong>Processing Window:</strong> Withdrawals are typically processed between the 1st and 5th of each calendar month for requests made in the previous month.</li>
          <li><strong>Minimum Threshold:</strong> You must reach a minimum balance (e.g., $100.00 USD equivalent) before a withdrawal can be initiated.</li>
          <li><strong>Verification:</strong> We reserve the right to delay or deny any withdrawal pending further identity or activity verification.</li>
          <li><strong>Forfeiture:</strong> Rewards not withdrawn within 12 months of being earned may be subject to forfeiture or administrative fees.</li>
        </ul>
        <h3>6.3 Merchant of Record (MoR) and Global Tax Remittance</h3>
        <p>
          We utilize a global Merchant of Record to handle all financial transactions.
        </p>
        <ul>
          <li><strong>Automatic Withholding:</strong> Depending on your jurisdiction, the MoR may automatically calculate and withhold necessary taxes (e.g., VAT, Income Tax, WHT) from your gross earnings.</li>
          <li><strong>Tax Reporting:</strong> You are responsible for reporting your earnings to your local tax authorities. We will provide annual earning statements where required by law.</li>
          <li><strong>Compliance:</strong> By using the reward system, you agree to provide all necessary information for tax compliance purposes.</li>
          <li><strong>Currency Conversion:</strong> Payouts are typically made in USD or the local currency equivalent at the time of processing, subject to prevailing exchange rates and fees.</li>
        </ul>

        <h2>7. Intellectual Property Rights and Content Licensing</h2>
        <h3>7.1 Company Intellectual Property</h3>
        <p>
          The Site, including its source code, databases, functionality, software, designs, audio, video, text, and graphics, and the trademarks and logos contained therein, are owned or controlled by us and are protected by international copyright and trademark laws.
        </p>
        <h3>7.2 User Content License</h3>
        <p>
          By posting Contributions, you grant us an irrevocable, perpetual, non-exclusive, transferable, royalty-free, worldwide license to use, copy, reproduce, disclose, sell, publish, broadcast, and distribute such content for any purpose, including commercial and advertising purposes. This includes the right to use your name, voice, and likeness as part of the content.
        </p>
        <h3>7.3 AI-Generated Content Ownership</h3>
        <p>
          Content generated by you using our AI Engine (e.g., AI-generated courses or reports) is subject to a joint-ownership model. You retain the right to use the content for personal purposes, but Pulse Feeds retains the right to use, modify, and monetize such content within the platform ecosystem.
        </p>

        <h2>8. Prohibited Activities and Platform Integrity</h2>
        <p>
          You may not access or use the Site for any purpose other than that for which we make the Site available. Prohibited activities include, but are not limited to:
        </p>
        <ul>
          <li><strong>Data Mining:</strong> Systematically retrieving data to create a competing database or service.</li>
          <li><strong>Automation:</strong> Using bots, spiders, or scripts to interact with the platform.</li>
          <li><strong>Security Interference:</strong> Attempting to bypass security measures or reverse engineer the software.</li>
          <li><strong>Harassment:</strong> Using the platform to stalk, threaten, or abuse other users or employees.</li>
          <li><strong>Misinformation:</strong> Spreading false information or engaging in deceptive practices.</li>
          <li><strong>Financial Fraud:</strong> Attempting to manipulate the reward system or engage in money laundering.</li>
          <li><strong>Spamming:</strong> Sending unsolicited messages or commercial advertisements.</li>
          <li><strong>Impersonation:</strong> Pretending to be another user or a Company representative.</li>
        </ul>

        <h2>9. Term, Termination, and Account Suspension</h2>
        <p>
          These Terms shall remain in effect while you use the Site. We reserve the right to, in our sole discretion and without notice or liability, deny access to the Site, terminate accounts, and delete any content for any reason, including breach of these Terms.
        </p>
        <p>
          Upon termination, your right to use the Site will cease immediately. If your account is terminated for cause (e.g., fraud or harassment), all accrued Pulse Points and pending rewards will be forfeited.
        </p>

        <h2>10. Disclaimers and Limitations of Liability</h2>
        <h3>10.1 "As Is" Basis</h3>
        <p>
          THE SITE IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SITE AND OUR SERVICES WILL BE AT YOUR SOLE RISK. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
        </p>
        <h3>10.2 Limitation of Damages</h3>
        <p>
          IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SITE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE SIX MONTHS PRIOR TO THE CLAIM.
        </p>

        <h2>11. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys’ fees and expenses, made by any third party due to or arising out of: (1) your Contributions; (2) use of the Site; (3) breach of these Terms; (4) any breach of your representations and warranties set forth in these Terms; (5) your violation of the rights of a third party, including but not limited to intellectual property rights; or (6) any overt harmful act toward any other user of the Site with whom you connected via the Site.
        </p>

        <h2>12. Dispute Resolution and Binding Arbitration</h2>
        <p>
          Any dispute arising out of these Terms shall be resolved through binding arbitration in New York, New York, under the rules of the American Arbitration Association. You waive your right to a jury trial and your right to participate in class actions.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of New York, without regard to its conflict of law principles.
        </p>

        <h2>14. Miscellaneous Provisions</h2>
        <p>
          These Terms constitute the entire agreement between you and us. Our failure to enforce any right shall not be a waiver of such right. If any provision is found to be unenforceable, the remaining provisions shall remain in effect.
        </p>

        <h2>15. User-Generated Content and Community Standards</h2>
        <p>
          Pulse Feeds is a platform for community engagement and expression. By posting content, you agree to adhere to our Community Standards:
        </p>
        <ul>
          <li><strong>No Hate Speech:</strong> We do not tolerate content that promotes violence, incites hatred, or discriminates based on race, ethnicity, religion, disability, age, nationality, veteran status, sexual orientation, gender or gender identity.</li>
          <li><strong>No Harassment:</strong> Bullying, stalking, or threatening other users is strictly prohibited.</li>
          <li><strong>No Explicit Content:</strong> Pornography and highly suggestive content are not allowed.</li>
          <li><strong>No Misinformation:</strong> Users must not spread demonstrably false information that could cause real-world harm.</li>
          <li><strong>No Illegal Acts:</strong> Content promoting illegal activities, including drug use, human trafficking, or terrorism, will be removed immediately and reported to authorities.</li>
        </ul>

        <h2>16. Intellectual Property in AI-Generated Content</h2>
        <p>
          Ownership of content generated by our AI tools (e.g., AI Eye reports, custom course curricula) is as follows:
        </p>
        <ul>
          <li><strong>User Inputs:</strong> You retain all rights to the prompts and data you provide to the AI.</li>
          <li><strong>AI Outputs:</strong> Pulse Feeds grants you a non-exclusive, perpetual, worldwide license to use the AI-generated outputs for personal or commercial purposes, subject to these Terms.</li>
          <li><strong>Platform Rights:</strong> Pulse Feeds retains the right to use anonymized AI outputs to improve our models and services.</li>
        </ul>

        <h2>17. Force Majeure</h2>
        <p>
          Pulse Feeds shall not be liable for any failure or delay in performance under these Terms due to circumstances beyond its reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.
        </p>

        <h2>18. Severability and Waiver</h2>
        <p>
          If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
        </p>
        <p>
          The failure of Pulse Feeds to exercise or enforce any right or provision of these Terms shall not operate as a waiver of such right or provision.
        </p>

        <h2>19. Entire Agreement</h2>
        <p>
          These Terms, together with our Privacy Policy and any other legal notices published by us on the Service, constitute the entire agreement between you and Pulse Feeds regarding your use of the Service.
        </p>

        <h2>20. Termination of Account</h2>
        <p>
          We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
        </p>

        <h2>21. Governing Law and Jurisdiction</h2>
        <p>
          These Terms shall be governed and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
        </p>

        <h2>22. Changes to Service</h2>
        <p>
          We reserve the right to withdraw or amend our Service, and any service or material we provide via the Service, in our sole discretion without notice. We will not be liable if for any reason all or any part of the Service is unavailable at any time or for any period.
        </p>

        <h2>23. Feedback and Suggestions</h2>
        <p>
          Any feedback, comments, ideas, improvements or suggestions provided by you to Pulse Feeds with respect to the Service shall remain the sole and exclusive property of Pulse Feeds.
        </p>

        <h2>24. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at legal@pulsefeeds.com.
        </p>

        <h2>25. User Responsibilities and Prohibited Conduct</h2>
        <p>
          As a user of Pulse Feeds, you are responsible for your own actions and for any content you provide. You agree not to:
        </p>
        <ul>
          <li><strong>System Interference:</strong> Attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service.</li>
          <li><strong>Data Scraping:</strong> Use any automated system, including without limitation "robots," "spiders," "offline readers," etc., to access the Service in a manner that sends more request messages to the Pulse Feeds servers than a human can reasonably produce in the same period of time by using a conventional on-line web browser.</li>
          <li><strong>Commercial Solicitation:</strong> Use the Service for any commercial solicitation purposes without our express written consent.</li>
          <li><strong>Intellectual Property Infringement:</strong> Upload, post, or otherwise transmit any content that infringes any patent, trademark, trade secret, copyright or other proprietary rights of any party.</li>
          <li><strong>Malicious Code:</strong> Upload or transmit any software viruses or any other computer code, files or programs designed to interrupt, destroy or limit the functionality of any computer software or hardware or telecommunications equipment.</li>
          <li><strong>Account Sharing:</strong> Share your account credentials or allow others to use your account.</li>
          <li><strong>False Reporting:</strong> Use the AI Eye feature to submit demonstrably false or malicious reports intended to harass individuals or organizations.</li>
        </ul>

        <h2>26. Limitation of Liability for AI Outputs</h2>
        <p>
          Pulse Feeds utilizes advanced AI models to provide insights and generate content. However, we do not guarantee the accuracy, completeness, or usefulness of any AI-generated output. You use such output at your own risk. Pulse Feeds shall not be liable for any damages or losses resulting from your reliance on AI-generated content.
        </p>

        <h2>27. Indemnification for User Content</h2>
        <p>
          You agree to indemnify and hold Pulse Feeds and its subsidiaries, affiliates, officers, agents, employees, partners and licensors harmless from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of content you submit, post, transmit, modify or otherwise make available through the Service.
        </p>

        <h2>28. Modification of Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
        </p>

        <h2>29. Survival of Provisions</h2>
        <p>
          The provisions of these Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity and limitations of liability.
        </p>

        <h2>30. Final Contact and Legal Notice</h2>
        <p>
          All legal notices should be sent to:
        </p>
        <p>
          Pulse Feeds Legal Department<br />
          Email: legal@pulsefeeds.com<br />
          Address: [Your Company Address Here]
        </p>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 text-center text-sm text-gray-500">
          <p>© 2026 Pulse Feeds. All rights reserved. Empowering communities through AI, engagement, and shared growth.</p>
        </div>
      </div>
    </div>
  );
}
