import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../Navbar/Navbar.jsx";
import Slider from "../Slider/Slider.jsx";
import History from "../History/History.jsx";
import Achievements from "../Achievements/Achievements.jsx";
import Partners from "../Partners/Partners.jsx";
import CampusShowcase from "../Campus3D/CampusShowcase.jsx";
import Footer from "../Footer/Footer.jsx";
import AdmissionForm from "../Admission/AdmissionForm.jsx";

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.scrollTo) {
      const sectionId = location.state.scrollTo;
      const element = document.getElementById(sectionId);
      
      if (element) {
        setTimeout(() => {
          const offsetTop = element.offsetTop - 80;
          window.scrollTo({
            top: offsetTop,
            behavior: "smooth",
          });
        }, 100); 
      }
    }
  }, [location]);

  return (
    <div className="home-container">
      <Navbar />

      <section id="home">
        <Slider />
      </section>

      <section id="history">
        <History />
      </section>

      <section id="achievements" className="achievements-section">
        <Achievements />
      </section>

      <section id="partners">
        <Partners />
      </section>

      <section id="campus">
        <CampusShowcase />
      </section>

      <section id="admission">
        <AdmissionForm />
      </section>

      <Footer />
    </div>
  );
}