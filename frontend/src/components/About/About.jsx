import React from 'react';

function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">About RentIQ</h1>
        <p className="text-gray-500 mb-8">Smarter rental property investment decisions.</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              RentIQ was created to simplify and modernize the way individuals evaluate rental property investments.
              In today's market, identifying a strong investment opportunity requires more than just browsing listings —
              it demands financial modeling, risk analysis, market comparison, and strategic alignment with personal
              financial constraints.
            </p>
            <p>
              Our platform combines data-driven financial modeling with personalized ranking and explainable AI.
              RentIQ analyzes available property listings, estimates projected investment performance, and evaluates
              key metrics such as potential return, affordability, and risk exposure. These insights are ranked based
              on user-specific inputs including budget and investment strategy.
            </p>
            <p>
              By automating complex financial analysis and delivering personalized, interpretable insights, RentIQ
              transforms rental investment decision-making into a more accessible, scalable, and data-backed process.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Platform Features</h2>
          <div className="space-y-4">
            {[
              ['AI-Generated Investment Ranking', 'Each property receives a personalized ranking score along with a clear explanation of how the score was calculated.'],
              ['Favorites Dashboard', 'Save properties to easily compare and revisit top opportunities.'],
              ['Detailed Property Insights', 'View comprehensive financial projections, metrics, and easy access to listing details in one centralized view.'],
              ['Customized Search', 'Filter and rank listings based on your budget and investment preferences.'],
              ['User Profile Management', 'Create and manage a profile that powers smarter, personalized recommendations.'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <div>
                  <span className="font-semibold text-gray-900">{title}</span>
                  <span className="text-gray-600 ml-1">— {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
