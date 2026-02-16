import React from 'react';

function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="card">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          About Us
        </h1>

        <p className="text-gray-600 mb-4">
          RentIQ was created to simplify and modernize the way individuals evaluate rental property investments. 
          In today’s market, identifying a strong investment opportunity requires more than just browsing listings, 
          it demands financial modeling, risk analysis, market comparison, and strategic alignment with personal 
          financial constraints. For many aspiring and independent investors, this process can be overwhelming, 
          time-intensive, and difficult to interpret without advanced expertise.
        </p>

        <p className="text-gray-600 mb-4">
          Our platform addresses this challenge by combining data-driven financial modeling with personalized ranking 
          and explainable AI. RentIQ analyzes available property listings, estimates projected investment performance, 
          and evaluates key metrics such as potential return, affordability, and risk exposure. These insights are then 
          ranked based on user-specific inputs including credit score, budget, and individual investment strategy. 
          Rather than presenting raw numbers alone, the system provides structured, transparent reasoning behind each 
          recommendation, allowing users to understand not just what to invest in, but also the why.
        </p>

        <p className="text-gray-600">
          By automating complex financial analysis and delivering personalized, interpretable insights, RentIQ transforms 
          rental investment decision-making into a more accessible, scalable, and data-backed process. Our mission is to 
          empower users with the clarity and confidence needed to make informed real estate investment decisions in an 
          increasingly competitive market.
        </p>
      </div>


      {/* Features Card */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Platform Features
        </h2>

        <ul className="space-y-4 text-gray-600">
          <li>
            <span className="font-semibold text-gray-800">
              AI-Generated Investment Ranking:
            </span>{' '}
            Each property receives a personalized ranking score along with a clear explanation of how the score was calculated.
          </li>

          <li>
            <span className="font-semibold text-gray-800">
              Favorites Dashboard:
            </span>{' '}
            Save properties to easily compare and revisit top opportunities.
          </li>

          <li>
            <span className="font-semibold text-gray-800">
              Detailed Property Insights:
            </span>{' '}
            View comprehensive financial projections, metrics, and easy access to listing details in one centralized view.
          </li>

          <li>
            <span className="font-semibold text-gray-800">
              Customized Search Capabilities:
            </span>{' '}
            Filter and rank listings based on your budget, credit score, and investment preferences.
          </li>

          <li>
            <span className="font-semibold text-gray-800">
              User Profile Management:
            </span>{' '}
            Create and manage a profile that powers smarter, personalized investment recommendations.
          </li>
        </ul>
      </div>

    </div>
  );
}

export default About;
