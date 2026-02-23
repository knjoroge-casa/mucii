import React from 'react';
import { ArrowRight, Home, CheckCircle, Package, Users, Sparkles, Clock, Shield } from 'lucide-react';

interface HomePageProps {
  onGetStarted: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  const features = [
    {
      icon: Home,
      title: 'Routines & Zones',
      description: 'Organise chores and household duties by room (e.g., kitchen, bedroom, living room) and set frequencies (weekly, monthly, seasonal).'
    },
    {
      icon: Package,
      title: 'Smart Inventory',
      description: "Always know what's in stock. When supplies run low, Mûcií adds them straight to your shopping list."
    },
    {
      icon: CheckCircle,
      title: 'Shopping Made Easy',
      description: 'A living shopping list that combines essentials with extras you add on the fly.'
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: 'Save Time',
      description: 'Streamline your household management with automated reminders and smart organisation.'
    },
    {
      icon: Users,
      title: 'Family Coordination',
      description: 'Keep everyone on the same page with shared tasks and clear responsibilities.'
    },
    {
      icon: Shield,
      title: 'Peace of Mind',
      description: 'Never forget important tasks or run out of essentials again.'
    }
  ];

  const whoItsFor = [
    'Busy professionals who want structure at home',
    'Families managing shared responsibilities',
    'Households with staff or housekeepers who need clear instructions',
    'Anyone who wants less mental load and more peace of mind'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-900 to-amber-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent">
                  Mûcií
                </h1>
                <p className="text-xs text-gray-600">Home, simplified</p>
              </div>
            </div>

            {/* Get Started Button */}
            <button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Digital Home Assistant</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-900 to-amber-600 bg-clip-text text-transparent mb-6">
              Mûcií
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 font-light mb-8">
              Home, simplified.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Mûcií means home in Kikuyu. It's a digital home assistant designed to take the stress out of running a household, 
              whether it's keeping track of chores, restocking the pantry, or remembering when to service your appliances.
            </p>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Mûcií?</h2>
              <p className="text-lg text-gray-700">
                Because managing a home shouldn't feel overwhelming, Mûcií brings clarity, structure, and a touch of elegance to everyday living.
              </p>
            </div>
          </div>

          <button
            onClick={onGetStarted}
            className="bg-gradient-to-r from-purple-900 to-purple-800 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-purple-900/25 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-3 mx-auto"
          >
            <span>Get Started Today</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What You Can Do with Mûcií
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools to manage every aspect of your home with ease and efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-amber-500 rounded-2xl flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Mûcií?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Who It's For
            </h2>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {whoItsFor.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900 to-amber-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Simplify Your Home?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of households who have transformed their home management with Mûcií.
            </p>
            <button
              onClick={onGetStarted}
              className="bg-white text-purple-900 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-3 mx-auto"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <span className="text-xl font-bold">Mûcií</span>
          </div>
          <p className="text-gray-400">Home, simplified.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;