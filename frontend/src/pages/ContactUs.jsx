// src/components/ContactUs.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaAngleDown, 
  FaAngleUp, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaFacebook, 
  FaTwitter, 
  FaInstagram,
  FaCalendarAlt,
  FaCreditCard,
  FaUserShield,
  FaHotel,
  FaQuestion,
  FaBookmark,
  FaArrowLeft
} from 'react-icons/fa';
import '../styles/ContactUs.css';

const ContactUs = () => {
  const navigate = useNavigate();
  // State pentru a gestiona secțiunea FAQ activă
  const [activeSection, setActiveSection] = useState('bookings');
  // State pentru a gestiona FAQ-urile expandate
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Funcție pentru a schimba secțiunea activă
  const changeSection = (section) => {
    setActiveSection(section);
    setExpandedFaq(null); // Reset expanded FAQ when changing section
  };

  // Funcție pentru a gestiona expandarea/colapsarea FAQ-urilor
  const toggleFaq = (index) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };

  // Funcție pentru a naviga înapoi la pagina principală
  const goBackToHome = () => {
    navigate('/');
  };

  // FAQ-uri organizate pe secțiuni
  const faqSections = {
    bookings: {
      icon: <FaCalendarAlt className="text-blue-400" />,
      title: "Rezervări",
      faqs: [
        {
          question: "Cum pot anula o rezervare?",
          answer: "Pentru a anula o rezervare, accesează secțiunea 'Rezervările mele' din contul tău, selectează rezervarea pe care dorești să o anulezi și apasă butonul 'Anulează'. Te rugăm să reții că politicile de anulare variază în funcție de proprietate și momentul anulării. Poți găsi detalii despre politica de anulare specifică în confirmarea rezervării."
        },
        {
          question: "Cum pot modifica datele de check-in sau check-out?",
          answer: "Pentru a modifica datele rezervării, accesează secțiunea 'Rezervările mele', selectează rezervarea dorită și apasă pe 'Modifică'. Dacă noile date sunt disponibile, poți efectua modificarea direct din platformă. În cazul în care întâmpini dificultăți, te rugăm să contactezi serviciul nostru de asistență clienți cu cel puțin 48 de ore înainte de check-in."
        },
        {
          question: "Ce se întâmplă dacă tariful se modifică după ce am făcut rezervarea?",
          answer: "Odată ce rezervarea ta este confirmată, prețul este garantat și nu se va modifica, indiferent de fluctuațiile ulterioare ale tarifelor. La Boksy, ne mândrim cu transparența prețurilor și respectăm întotdeauna tariful convenit la momentul rezervării."
        },
        {
          question: "Cum pot adăuga cerințe speciale la rezervarea mea?",
          answer: "Poți adăuga cerințe speciale în timpul procesului de rezervare, în secțiunea 'Solicitări speciale'. Alternativ, după finalizarea rezervării, poți accesa secțiunea 'Rezervările mele' și adăuga solicitări prin opțiunea 'Editează detalii'. Te rugăm să reții că cererile speciale sunt supuse disponibilității și nu pot fi garantate."
        }
      ]
    },
    payment: {
      icon: <FaCreditCard className="text-blue-400" />,
      title: "Plăți și Facturare",
      faqs: [
        {
          question: "Ce metode de plată acceptați?",
          answer: "Boksy acceptă o varietate de metode de plată, inclusiv carduri de credit/debit (Visa, Mastercard, American Express), PayPal, Apple Pay și Google Pay. În funcție de proprietate, poți opta să plătești integral în avans sau doar un avans, restul sumei fiind achitat la check-in."
        },
        {
          question: "Cum pot obține o factură pentru rezervarea mea?",
          answer: "Facturile pentru rezervări sunt disponibile în secțiunea 'Rezervările mele' din contul tău Boksy. Selectează rezervarea pentru care dorești factura și apasă pe opțiunea 'Descarcă factură'. Dacă ai nevoie de o factură cu detalii specifice sau pe numele unei companii, te rugăm să contactezi echipa noastră de asistență clienți înainte de efectuarea plății."
        },
        {
          question: "Cum funcționează rambursările în cazul anulărilor?",
          answer: "Rambursările sunt procesate automat pe metoda de plată originală în termen de 5-10 zile lucrătoare de la aprobarea anulării, în funcție de politica de anulare a proprietății și a băncii tale. Pentru rezervările plătite parțial sau integral la proprietate, va trebui să contactezi direct proprietatea pentru rambursare."
        }
      ]
    },
    problems: {
      icon: <FaQuestion className="text-blue-400" />,
      title: "Probleme și Soluții",
      faqs: [
        {
          question: "Ce fac dacă am probleme la check-in?",
          answer: "În cazul în care întâmpini dificultăți la check-in, te rugăm să contactezi imediat proprietatea folosind informațiile de contact furnizate în confirmarea rezervării. Alternativ, linia noastră de asistență de urgență este disponibilă 24/7 la numărul afișat în aplicație. Echipa noastră va colabora cu proprietatea pentru a rezolva problema cât mai rapid posibil."
        },
        {
          question: "Ce trebuie să fac dacă proprietatea nu corespunde descrierii?",
          answer: "Dacă proprietatea nu corespunde descrierii de pe Boksy, te rugăm să documentezi diferențele (fotografii, notițe) și să ne contactezi în primele 24 de ore după check-in. Echipa noastră va investiga situația și va lucra pentru a găsi o soluție satisfăcătoare, care poate include relocarea, compensarea sau rambursarea, în funcție de gravitatea situației."
        },
        {
          question: "Care este politica de rambursare în caz de forță majoră?",
          answer: "În situații de forță majoră (dezastre naturale, restricții guvernamentale de călătorie, etc.), Boksy colaborează îndeaproape cu partenerii noștri pentru a oferi opțiuni flexibile clienților. În funcție de circumstanțe, acestea pot include reprogramarea gratuită a sejurului sau rambursarea integrală. Te rugăm să contactezi serviciul clienți cât mai curând posibil pentru asistență personalizată."
        }
      ]
    },
    account: {
      icon: <FaUserShield className="text-blue-400" />,
      title: "Cont și Securitate",
      faqs: [
        {
          question: "Cum îmi pot actualiza datele contului?",
          answer: "Pentru a actualiza informațiile personale, accesează 'Profilul meu' din meniul principal. Aici poți modifica adresa de email, numărul de telefon și alte detalii. Pentru schimbarea parolei, folosește opțiunea 'Securitate' din același meniu. Toate modificările sunt aplicate imediat și vei primi o confirmare pe email."
        },
        {
          question: "Cum îmi pot recupera parola uitată?",
          answer: "Dacă ai uitat parola, apasă pe 'Ai uitat parola?' pe pagina de autentificare. Introdu adresa de email asociată contului tău și vei primi un link pentru resetarea parolei. Linkul este valabil 24 de ore. Din motive de securitate, parolele noi trebuie să fie diferite de cele utilizate anterior."
        },
        {
          question: "Este sigur să îmi salvez datele cardului de credit în aplicație?",
          answer: "Da, Boksy folosește criptare de ultimă generație pentru a proteja datele tale financiare. Nu stocăm niciodată numărul complet al cardului tău, ci doar ultimele 4 cifre pentru referință. Toată procesarea plăților este realizată prin gateway-uri securizate certificate PCI DSS Level 1, cel mai înalt standard de securitate pentru tranzacții online."
        }
      ]
    },
    loyalty: {
      icon: <FaBookmark className="text-blue-400" />,
      title: "Program Fidelitate",
      faqs: [
        {
          question: "Cum funcționează programul de fidelitate Boksy Rewards?",
          answer: "Programul Boksy Rewards îți oferă puncte pentru fiecare rezervare efectuată prin platforma noastră. La fiecare 10 puncte acumulate, primești o reducere de 10% pentru următoarea rezervare. Poți vizualiza punctele acumulate și beneficiile disponibile în secțiunea 'Boksy Rewards' din profilul tău. În plus, membrii programului beneficiază de oferte exclusive și acces prioritar la promoții."
        },
        {
          question: "Când expiră punctele din programul de fidelitate?",
          answer: "Punctele Boksy Rewards sunt valabile timp de 24 de luni de la data acumulării. Vei primi notificări automate cu 30 de zile înainte ca punctele tale să expire, oferindu-ți timp suficient pentru a le utiliza. Membrii de nivel Gold și Platinum beneficiază de puncte care nu expiră niciodată."
        },
        {
          question: "Pot transfera punctele mele de fidelitate către alt utilizator?",
          answer: "Da, membrii Boksy Rewards pot transfera până la 50% din punctele lor către un alt membru al familiei sau un prieten, o dată pe an. Pentru a efectua transferul, accesează secțiunea 'Boksy Rewards' din contul tău și selectează opțiunea 'Transfer puncte'. Vei avea nevoie de adresa de email a destinatarului, care trebuie să fie și el membru al programului de fidelitate."
        }
      ]
    },
    properties: {
      icon: <FaHotel className="text-blue-400" />,
      title: "Proprietăți și Facilități",
      faqs: [
        {
          question: "Cum verificați calitatea proprietăților listate pe Boksy?",
          answer: "Fiecare proprietate listată pe Boksy trece printr-un proces riguros de verificare înainte de a fi aprobată. Acest proces include verificarea documentelor oficiale, evaluarea fotografiilor și, în multe cazuri, inspecții fizice efectuate de echipa noastră. În plus, monitorizăm constant recenziile clienților și luăm măsuri prompte în cazul feedback-ului negativ repetat."
        },
        {
          question: "Pot solicita facilități specifice la o proprietate?",
          answer: "Da, poți specifica facilități dorite în timpul procesului de rezervare. Recomandăm să verifici în prealabil lista de facilități disponibile pentru fiecare proprietate. Pentru cerințe foarte specifice, te încurajăm să contactezi direct proprietatea după confirmarea rezervării. Boksy oferă și filtre avansate de căutare pentru a găsi proprietăți cu facilitățile tale preferate."
        },
        {
          question: "Cum pot raporta o problemă cu o proprietate listată?",
          answer: "Dacă observi informații incorecte sau înșelătoare despre o proprietate, sau dacă ai experimentat probleme semnificative care nu sunt reflectate în descrierea proprietății, poți raporta problema prin butonul 'Raportează o problemă' de pe pagina proprietății. Alternativ, poți contacta serviciul nostru de asistență clienți. Fiecare raport este investigat temeinic."
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Back button */}
      <div className="pt-6 px-6">
        <button 
          onClick={goBackToHome}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors bg-gray-800/50 p-2 rounded-full"
        >
          <FaArrowLeft />
          <span className="hidden sm:inline">Înapoi acasă</span>
        </button>
      </div>
      
      {/* Hero Section with Animated Gradient Background */}
      <div className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-overlay"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto text-center z-10">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-500">Asistență Boksy</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-300 leading-relaxed">
              Echipa noastră este disponibilă pentru a răspunde la toate întrebările tale despre călătoria ta perfectă.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a href="#contact-form" className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50">
                Contactează-ne
              </a>
              <a href="#faq" className="px-8 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                Întrebări Frecvente
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information with Glass Effect */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-blue-900 opacity-5 transform -skew-y-6"></div>
        <div className="max-w-7xl mx-auto relative">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-500">Moduri de Contact</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm shadow-xl border border-gray-700/50 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-500/20">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 p-4 bg-blue-500 rounded-full shadow-lg group-hover:bg-blue-400 transition-all duration-300">
                <FaPhone className="h-6 w-6 text-white" />
              </div>
              <div className="pt-8 text-center">
                <h3 className="mt-2 text-xl font-semibold">Telefon</h3>
                <p className="mt-3 text-gray-400">Suport telefonic disponibil</p>
                <div className="border-t border-gray-700 my-4"></div>
                <p className="text-gray-300">Luni-Vineri: 8:00 - 22:00</p>
                <p className="text-gray-300">Weekend: 10:00 - 18:00</p>
                <a href="tel:+40212345678" className="mt-4 inline-block text-blue-400 font-medium hover:text-blue-300 transition-colors">
                  +40 21 234 5678
                </a>
              </div>
            </div>

            <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm shadow-xl border border-gray-700/50 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-500/20">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 p-4 bg-blue-500 rounded-full shadow-lg group-hover:bg-blue-400 transition-all duration-300">
                <FaEnvelope className="h-6 w-6 text-white" />
              </div>
              <div className="pt-8 text-center">
                <h3 className="mt-2 text-xl font-semibold">Email</h3>
                <p className="mt-3 text-gray-400">Suport prin email non-stop</p>
                <div className="border-t border-gray-700 my-4"></div>
                <p className="text-gray-300">Răspuns standard: 24 ore</p>
                <p className="text-gray-300">Urgențe: 2-4 ore</p>
                <a href="mailto:support@boksy.ro" className="mt-4 inline-block text-blue-400 font-medium hover:text-blue-300 transition-colors">
                  support@boksy.ro
                </a>
              </div>
            </div>

            <div className="group relative p-8 rounded-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm shadow-xl border border-gray-700/50 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-500/20">
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 p-4 bg-blue-500 rounded-full shadow-lg group-hover:bg-blue-400 transition-all duration-300">
                <FaMapMarkerAlt className="h-6 w-6 text-white" />
              </div>
              <div className="pt-8 text-center">
                <h3 className="mt-2 text-xl font-semibold">Sediu</h3>
                <p className="mt-3 text-gray-400">Vizitează-ne la birou</p>
                <div className="border-t border-gray-700 my-4"></div>
                <p className="text-gray-300">Bd. Unirii 22,</p>
                <p className="text-gray-300">București, România</p>
                <a href="https://goo.gl/maps" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-blue-400 font-medium hover:text-blue-300 transition-colors">
                  Vezi pe hartă
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section with Tabs */}
      <div id="faq" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-500">Întrebări Frecvente</span>
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-3xl mx-auto">
            Găsește rapid răspunsurile la cele mai comune întrebări despre serviciile noastre, organizate pe categorii pentru ușurința navigării.
          </p>
          
          {/* FAQ Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.keys(faqSections).map((section) => (
              <button
                key={section}
                onClick={() => changeSection(section)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeSection === section 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{faqSections[section].icon}</span>
                {faqSections[section].title}
              </button>
            ))}
          </div>
          
          {/* Active Section FAQs */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/30 overflow-hidden">
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-bold flex items-center mb-6 text-blue-400">
                {faqSections[activeSection].icon}
                <span className="ml-2">{faqSections[activeSection].title}</span>
              </h3>
              
              <div className="space-y-4">
                {faqSections[activeSection].faqs.map((faq, index) => (
                  <div key={index} className="overflow-hidden">
                    <div 
                      className={`rounded-xl transition-all duration-300 ${
                        expandedFaq === index 
                          ? 'bg-gray-800 shadow-lg' 
                          : 'bg-gray-800/50 hover:bg-gray-800/80'
                      }`}
                    >
                      <button
                        className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                        onClick={() => toggleFaq(index)}
                      >
                        <span className="text-lg font-medium">{faq.question}</span>
                        <span className={`transition-transform duration-300 transform ${expandedFaq === index ? 'rotate-180' : ''}`}>
                          <FaAngleDown className="h-5 w-5 text-blue-400" />
                        </span>
                      </button>
                      
                      <div 
                        className={`transition-all duration-300 px-6 overflow-hidden ${
                          expandedFaq === index ? 'max-h-96 pb-6' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="border-t border-gray-700 mb-4"></div>
                        <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form with Floating Labels */}
      <div id="contact-form" className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-blue-900 opacity-5 transform skew-y-6"></div>
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-blue-500">
                Nu ai găsit răspunsul?
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Completează formularul de mai jos și echipa noastră îți va răspunde în cel mai scurt timp posibil.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700/30">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    className="peer w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-transparent"
                    placeholder="Numele tău"
                    required
                  />
                  <label 
                    htmlFor="name" 
                    className="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-blue-400"
                  >
                    Numele tău
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    className="peer w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-transparent"
                    placeholder="Email-ul tău"
                    required
                  />
                  <label 
                    htmlFor="email" 
                    className="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-blue-400"
                  >
                    Email-ul tău
                  </label>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  id="subject"
                  className="peer w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-transparent"
                  placeholder="Subiectul mesajului"
                  required
                />
                <label 
                  htmlFor="subject" 
                  className="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-blue-400"
                >
                  Subiectul mesajului
                </label>
              </div>
              
              <div className="relative">
                <select
                  id="category"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled selected>Selectează categoria</option>
                  <option value="booking">Probleme cu rezervarea</option>
                  <option value="payment">Plăți și rambursări</option>
                  <option value="account">Cont și profil</option>
                  <option value="property">Probleme cu proprietatea</option>
                  <option value="rewards">Program de fidelitate</option>
                  <option value="other">Altele</option>
                </select>
              </div>
              
              <div className="relative">
                <textarea
                  id="message"
                  rows={6}
                  className="peer w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-transparent"
                  placeholder="Detaliile mesajului tău"
                  required
                ></textarea>
                <label 
                  htmlFor="message" 
                  className="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-blue-400"
                >
                  Detaliile mesajului tău
                </label>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  id="booking-id"
                  className="peer w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-transparent"
                  placeholder="ID Rezervare (opțional)"
                />
                <label 
                  htmlFor="booking-id" 
                  className="absolute text-sm text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-blue-400"
                >
                  ID Rezervare (opțional)
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  id="privacy"
                  name="privacy"
                  type="checkbox"
                  className="h-5 w-5 text-blue-500 focus:ring-blue-400 border-gray-300 rounded mt-1"
                  required
                />
                <label htmlFor="privacy" className="ml-3 block text-sm text-gray-300">
                  Sunt de acord cu <a href="/privacy-policy" className="text-blue-400 hover:underline">Politica de Confidențialitate</a> și prelucrarea datelor mele în scopul de a răspunde la această solicitare.
                </label>
              </div>
              
              <div className="text-center">
                <button 
                  type="submit" 
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                >
                  Trimite Mesajul
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Social Media & Newsletter */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/60">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Social Media Links */}
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-semibold mb-6 text-blue-400">Conectează-te cu noi</h3>
              <p className="text-gray-400 mb-8">
                Urmărește-ne pe rețelele sociale pentru noutăți, oferte speciale și inspirație pentru călătoriile tale.
              </p>
              <div className="flex justify-center md:justify-start space-x-6">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-800 rounded-full text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300">
                  <FaFacebook className="h-6 w-6" />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-800 rounded-full text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300">
                  <FaTwitter className="h-6 w-6" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-800 rounded-full text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300">
                  <FaInstagram className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Boksy. Toate drepturile rezervate.</p>
          <div className="mt-4 flex justify-center space-x-6">
            <a href="/terms" className="hover:text-blue-400 transition-colors">Termeni și condiții</a>
            <a href="/privacy-policy" className="hover:text-blue-400 transition-colors">Politica de confidențialitate</a>
            <a href="/cookies" className="hover:text-blue-400 transition-colors">Politica de cookie-uri</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactUs;