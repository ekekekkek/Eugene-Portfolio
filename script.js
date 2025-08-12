// Mobile menu functionality
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
  hamburger.classList.remove('active');
  navMenu.classList.remove('active');
}));

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 100) {
    navbar.style.background = 'rgba(255, 255, 255, 0.98)';
    navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
  } else {
    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    navbar.style.boxShadow = 'none';
  }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offsetTop = target.offsetTop - 70; // Account for fixed navbar
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  });
});

// Intersection Observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe all sections for animation
document.querySelectorAll('.section').forEach(section => {
  section.style.opacity = '0';
  section.style.transform = 'translateY(30px)';
  section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(section);
});

// Active navigation highlighting
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    const sectionHeight = section.clientHeight;
    if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
});

// Video functionality - Auto-play when in viewport
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;
    
    if (entry.isIntersecting) {
      // Video is visible, play it
      video.play().catch(e => {
        // Handle autoplay restrictions
        console.log('Autoplay prevented:', e);
      });
    } else {
      // Video is not visible, pause it
      video.pause();
    }
  });
}, {
  threshold: 0.3, // Play when 30% of video is visible
  rootMargin: '0px 0px -50px 0px'
});

// Observe all videos
document.querySelectorAll('video').forEach(video => {
  videoObserver.observe(video);
});

// Auto-pause videos when they end
document.querySelectorAll('video').forEach(video => {
  video.addEventListener('ended', () => {
    const overlay = video.closest('.work-video-container, .playground-video-container').querySelector('.video-overlay');
    const button = overlay.querySelector('.play-button');
    overlay.style.opacity = '1';
    button.textContent = '▶';
  });
});

// Videos are now managed by Intersection Observer

// Portfolio site loaded
console.log("Portfolio site loaded successfully!");

// Project page sidebar navigation functionality
if (document.querySelector('.project-sidebar')) {
  const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');
  const projectSections = document.querySelectorAll('.project-section[id]');

                 // Smooth scrolling for sidebar links (excluding external links)
               sidebarLinks.forEach(link => {
                 link.addEventListener('click', function (e) {
                   const href = this.getAttribute('href');
                   
                   // Skip smooth scrolling for external links (Back link)
                   if (!href.startsWith('#')) {
                     return; // Allow normal navigation for external links
                   }
                   
                   e.preventDefault();
                   const targetId = href.substring(1);
                   const targetSection = document.getElementById(targetId);
         
                   if (targetSection) {
                     const offsetTop = targetSection.offsetTop + 50; // Increased offset for higher positioning
                     window.scrollTo({
                       top: offsetTop,
                       behavior: 'smooth'
                     });
                   }
                 });
               });

  // Active sidebar link highlighting
  window.addEventListener('scroll', () => {
    let current = '';
    projectSections.forEach(section => {
      const sectionTop = section.offsetTop - 150;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    sidebarLinks.forEach(link => {
      link.classList.remove('active');
      const linkId = link.getAttribute('href').substring(1);
      if (linkId === current) {
        link.classList.add('active');
      }
    });
  });

  // Set initial active state
  if (projectSections.length > 0) {
    const firstSectionId = projectSections[0].getAttribute('id');
    const firstLink = document.querySelector(`[href="#${firstSectionId}"]`);
    if (firstLink) {
      firstLink.classList.add('active');
    }
  }
}
