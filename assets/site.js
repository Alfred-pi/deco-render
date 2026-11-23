/* Deco Render · site public. Aucune dépendance, aucun cookie, aucun stockage, aucun appel réseau. */
(function () {
  "use strict";

  var root = document.documentElement;
  var config = window.DECO_RENDER || {};
  var en = (root.lang || "fr").slice(0, 2) === "en";
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Dossier assets/, d’après l’adresse de ce script : les pages sont à des profondeurs différentes. */
  var assets = ((document.currentScript && document.currentScript.src) || "").replace(/site\.js[^/]*$/, "");

  var text = en
    ? {
        download: "Download on the App Store",
        get: "Download",
        contact: "For any question or request, write to ",
        publisher: "Publisher: ",
        position: function (p) { return p + "% before, " + (100 - p) + "% after"; },
        after: "After",
        and: " and ",
        redo: "Redo ",
        redoAll: "Redo everything",
        keep: " Keep ",
        style: function (s) { return ", in " + s + " style"; },
        states: { none: "", redo: ", to redo", keep: ", kept" }
      }
    : {
        download: "Télécharger dans l’App Store",
        get: "Télécharger",
        contact: "Pour toute question ou demande, écrivez à ",
        publisher: "Éditeur : ",
        position: function (p) { return p + " % avant, " + (100 - p) + " % après"; },
        after: "Après",
        and: " et ",
        redo: "On refait ",
        redoAll: "On refait tout",
        keep: " On garde ",
        style: function (s) { return ", en " + s; },
        states: { none: "", redo: ", à refaire", keep: ", gardé" }
      };

  function all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* Chaque partie est indépendante : une erreur dans l’une n’arrête pas les autres. */
  function part(run) {
    try { run(); } catch (error) { if (window.console) console.error(error); }
  }

  /* ——— Apparitions au défilement. En premier : le contenu ne doit jamais rester caché. ——— */
  part(function () {
    var revealed = all("[data-reveal], [data-draw]");
    function show(node) { node.classList.add("is-in"); }
    if (!("IntersectionObserver" in window) || calm || !root.classList.contains("reveal")) {
      revealed.forEach(show);
    } else {
      var watcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          watcher.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
      revealed.forEach(function (node) { watcher.observe(node); });
    }
    window.DECO_RENDER_READY = true;
  });

  /* ——— App Store, d’après assets/config.js : badge officiel d’Apple là où il est prévu, lien texte ailleurs ——— */
  part(function () {
    var storeUrl = String(config.appStoreUrl || "").trim();
    if (!/^https:\/\/apps\.apple\.com\//.test(storeUrl)) return;
    all("[data-store]").forEach(function (waiting) {
      var link = document.createElement("a");
      link.href = storeUrl;
      link.rel = "noopener";
      if (waiting.dataset.store === "badge" && assets) {
        var badge = new Image();
        badge.src = assets + "img/badge-app-store-" + (en ? "en" : "fr") + ".svg";
        badge.alt = text.download;
        badge.width = en ? 168 : 177;
        badge.height = 56;
        link.className = "badge";
        link.appendChild(badge);
      } else {
        link.className = waiting.className;
        link.textContent = waiting.dataset.store === "badge" ? text.download : text.get;
      }
      waiting.replaceWith(link);
    });
  });

  /* ——— Éditeur et adresse de contact, d’après assets/config.js ——— */
  part(function () {
    var email = String(config.contactEmail || "").trim();
    if (/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) {
      all("[data-contact]").forEach(function (slot) {
        var link = document.createElement("a");
        link.href = "mailto:" + email;
        link.textContent = email;
        slot.textContent = text.contact;
        slot.appendChild(link);
        slot.appendChild(document.createTextNode("."));
      });
    }
    var name = String(config.publisherName || "").trim();
    var address = String(config.publisherAddress || "").trim();
    if (name) {
      all("[data-publisher]").forEach(function (slot) {
        slot.textContent = text.publisher + name + (address ? ", " + address : "") + ".";
        slot.hidden = false;
      });
    }
  });

  /* ——— Comparateur avant, après ——— */
  part(function () {
    all("[data-compare]").forEach(function (figure) {
      var stage = figure.querySelector(".compare__stage");
      var range = figure.querySelector(".compare__range");
      var before = figure.querySelector("[data-before]");
      var after = figure.querySelector("[data-after]");
      var afterTag = figure.querySelector("[data-after-label]");
      var dragging = false;
      var touched = false;   /* le visiteur a pris la main : plus de mouvement automatique */
      var start = null;      /* doigt posé, en attente de savoir s’il glisse ou s’il fait défiler la page */

      function set(value, glide) {
        var p = Math.max(0, Math.min(100, Math.round(value)));
        figure.classList.toggle("is-gliding", !!glide && !calm);
        figure.style.setProperty("--pos", p + "%");
        range.value = p;
        range.setAttribute("aria-valuetext", text.position(p));
      }

      function at(event) {
        var box = stage.getBoundingClientRect();
        return ((event.clientX - box.left) / box.width) * 100;
      }

      function drag(event) {
        dragging = true;
        touched = true;
        figure.classList.add("is-dragging");
        try { stage.setPointerCapture(event.pointerId); } catch (error) { /* pointeur déjà relâché */ }
        set(at(event), false);
      }

      function release() {
        dragging = false;
        start = null;
        figure.classList.remove("is-dragging");
      }

      stage.addEventListener("pointerdown", function (event) {
        if (event.button > 0 || event.target.closest(".spaces")) return;
        /* Au doigt, rien ne bouge au contact : un défilement vertical qui part de la photo ne déplace pas la séparation. */
        if (event.pointerType === "touch") { start = { x: event.clientX, y: event.clientY }; return; }
        drag(event);
      });
      stage.addEventListener("pointermove", function (event) {
        if (dragging) { set(at(event), false); return; }
        if (!start) return;
        var dx = Math.abs(event.clientX - start.x);
        var dy = Math.abs(event.clientY - start.y);
        if (dy > 8 && dy >= dx) { start = null; return; }
        if (dx > 8 && dx > dy) { start = null; drag(event); }
      });
      stage.addEventListener("pointerup", function (event) {
        /* Simple toucher, sans glisser : la séparation vient sous le doigt. */
        if (start && !dragging) { touched = true; set(at(event), true); }
        release();
      });
      stage.addEventListener("pointercancel", release);
      stage.addEventListener("lostpointercapture", release);
      range.addEventListener("input", function () { touched = true; set(Number(range.value), false); });
      set(Number(range.value) || 50, false);

      /* Petit va-et-vient à la première apparition, pour montrer que ça se glisse. */
      if (!calm && "IntersectionObserver" in window) {
        var seen = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          seen.disconnect();
          setTimeout(function () { if (!touched) set(68, true); }, 900);
          setTimeout(function () { if (!touched) set(50, true); }, 1900);
          setTimeout(function () { if (!touched) figure.classList.remove("is-gliding"); }, 2900);
        }, { threshold: 0.6 });
        seen.observe(stage);
      }

      /* Réglette Intérieur, Façade, Jardin : change les deux photos et le mot du titre. */
      var words = all("[data-hero-word]");
      all(".spaces input", figure).forEach(function (radio) {
        radio.addEventListener("change", function () {
          if (!radio.checked) return;
          var data = radio.dataset;
          var token = (figure.dataset.token = String(Date.now()));
          var nextBefore = new Image();
          var nextAfter = new Image();
          var pending = 2;
          function ready() {
            pending -= 1;
            if (pending > 0 || figure.dataset.token !== token) return;
            before.src = data.before;
            after.src = data.after;
            before.alt = data.beforeAlt;
            after.alt = data.afterAlt;
            afterTag.textContent = text.after + " · " + data.style;
            figure.classList.remove("is-loading");
            set(50, true);
          }
          figure.classList.add("is-loading");
          nextBefore.onload = nextBefore.onerror = ready;
          nextAfter.onload = nextAfter.onerror = ready;
          nextBefore.src = data.before;
          nextAfter.src = data.after;

          words.forEach(function (word) {
            if (calm) { word.textContent = data.word; return; }
            word.classList.add("is-out");
            setTimeout(function () {
              word.textContent = data.word;
              word.classList.remove("is-out");
            }, 280);
          });
        });
      });
    });
  });

  /* ——— Le geste, comme dans l’app : toucher une zone, on la refait (ou plus) ; la maintenir, on la garde (ou plus).
     Au clavier, où l’on ne peut pas maintenir, Entrée ou Espace passe de « à refaire » à « gardé », puis à rien. ——— */
  part(function () {
    var HOLD = 480;
    all("[data-demo]").forEach(function (demo) {
      var photo = demo.querySelector("[data-zonephoto]");
      var pins = all("button[data-zone]", demo);
      var sentence = demo.querySelector("[data-sentence]");
      var reset = demo.querySelector("[data-reset]");
      var hint = demo.querySelector("#geste-clavier");
      /* Deux listes, dans l’ordre où l’on a désigné : c’est cet ordre que suit la phrase. */
      var redo = [];
      var keep = [];
      var byId = {};

      pins.forEach(function (pin) {
        var id = pin.dataset.zone;
        byId[id] = { pin: pin, zone: demo.querySelector('.zone[data-zone="' + id + '"]') };
        if (hint) pin.setAttribute("aria-describedby", hint.id);
      });
      /* État de départ, dans l’ordre de la phrase (attributs data-redo et data-keep). */
      function listed(value) {
        return String(value || "").split(/\s+/).filter(function (id) { return byId[id]; });
      }
      redo = listed(demo.dataset.redo);
      keep = listed(demo.dataset.keep);

      function stateOf(id) {
        return redo.indexOf(id) >= 0 ? "redo" : keep.indexOf(id) >= 0 ? "keep" : "none";
      }
      function without(list, id) {
        var index = list.indexOf(id);
        if (index >= 0) list.splice(index, 1);
        return index >= 0;
      }
      function toggleRedo(id) {
        without(keep, id);
        if (!without(redo, id)) redo.push(id);
      }
      function toggleKeep(id) {
        without(redo, id);
        if (!without(keep, id)) keep.push(id);
      }
      function cycle(id) {
        if (stateOf(id) === "none") toggleRedo(id); else toggleKeep(id);
      }

      function join(list) {
        if (list.length < 2) return list.join("");
        return list.slice(0, -1).join(", ") + text.and + list[list.length - 1];
      }
      function words(kind, ids) {
        return ids.map(function (id) { return '<b class="w-' + kind + '">' + byId[id].pin.dataset.phrase + "</b>"; });
      }

      function draw() {
        Object.keys(byId).forEach(function (id) {
          var state = stateOf(id);
          var entry = byId[id];
          entry.pin.dataset.state = state;
          entry.pin.setAttribute("aria-label", entry.pin.dataset.label + text.states[state]);
          if (entry.zone) entry.zone.dataset.state = state;
        });
        var style = demo.querySelector(".pills input:checked");
        var html = redo.length ? text.redo + join(words("redo", redo)) : text.redoAll;
        if (style) html += text.style('<b class="w-style">' + style.value + "</b>");
        html += ".";
        if (keep.length) html += text.keep + join(words("keep", keep)) + ".";
        sentence.innerHTML = html;
        if (reset) reset.hidden = redo.length === 0;
      }

      /* Une cible (zone dessinée ou repère) : toucher, ou maintenir. */
      function wire(target, id) {
        var timer = null;
        var held = false;
        var origin = null;
        function cancel() { clearTimeout(timer); timer = null; }

        target.addEventListener("pointerdown", function (event) {
          if (event.button > 0) return;
          held = false;
          origin = { x: event.clientX, y: event.clientY };
          cancel();
          timer = setTimeout(function () {
            held = true;
            toggleKeep(id);
            draw();
          }, HOLD);
        });
        target.addEventListener("pointermove", function (event) {
          if (timer && origin && Math.abs(event.clientX - origin.x) + Math.abs(event.clientY - origin.y) > 12) cancel();
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach(function (name) {
          target.addEventListener(name, cancel);
        });
        target.addEventListener("contextmenu", function (event) { event.preventDefault(); });
        target.addEventListener("click", function (event) {
          if (held) { held = false; return; }
          /* detail vaut 0 quand le clic vient du clavier ou d’une aide technique. */
          if (event.detail === 0) cycle(id); else toggleRedo(id);
          draw();
        });
      }

      Object.keys(byId).forEach(function (id) {
        wire(byId[id].pin, id);
        if (byId[id].zone) wire(byId[id].zone, id);
      });

      /* Fenêtres et portes : on ne les refait pas, leur étiquette le rappelle d’un petit mouvement. */
      all(".zone--fixed", demo).forEach(function (zone) {
        var label = demo.querySelector('.pin--fixed[data-fixed="' + zone.dataset.fixed + '"]');
        if (!label) return;
        zone.addEventListener("click", function () {
          label.classList.remove("is-nudged");
          void label.offsetWidth;
          label.classList.add("is-nudged");
        });
      });

      all(".pills input", demo).forEach(function (radio) { radio.addEventListener("change", draw); });
      if (reset) {
        reset.addEventListener("click", function () {
          redo.length = 0;
          draw();
        });
      }

      /* Les pointillés n’avancent que lorsque la photo est à l’écran. */
      if (photo && !calm && "IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          photo.classList.toggle("is-live", entries[0].isIntersecting);
        }).observe(photo);
      }
      draw();
    });
  });
})();
