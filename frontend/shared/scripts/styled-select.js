const openSelects = new Set();
let selectCounter = 0;

document.addEventListener("pointerdown", event => {
    for (const control of openSelects) {
        if (!control.wrapper.contains(event.target)) control.close(false);
    }
});

document.addEventListener("scroll", () => {
    for (const control of openSelects) control.close(false);
}, true);

export function enhanceSelects(root = document) {
    const cleanup = [...root.querySelectorAll("select")].map(enhanceSelect);
    return () => cleanup.reverse().forEach(dispose => dispose());
}

export function enhanceSelect(select) {
    if (!select || select.dataset.styledSelect === "true") return () => {};

    const id = select.id || `styled-select-${++selectCounter}`;
    select.id = id;

    const label = [...document.querySelectorAll("label[for]")]
        .find(item => item.htmlFor === id);
    const wrapper = document.createElement("div");
    wrapper.className = "styled-select";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select);

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "styled-select-trigger";
    trigger.id = `${id}-trigger`;
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${id}-options`);
    trigger.setAttribute("aria-label", label?.textContent.trim() || select.getAttribute("aria-label") || "Choose an option");
    const isRequired = select.required;
    if (isRequired) {
        trigger.setAttribute("aria-required", "true");
        select.required = false;
    }

    const value = document.createElement("span");
    value.className = "styled-select-value";
    const chevron = document.createElement("span");
    chevron.className = "styled-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    trigger.append(value, chevron);

    const listbox = document.createElement("div");
    listbox.className = "styled-select-options";
    listbox.id = `${id}-options`;
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("aria-label", label?.textContent.trim() || "Options");
    listbox.hidden = true;

    let options = [];

    function buildOptions() {
        options = [...select.options].map(option => {
        const item = document.createElement("div");
        item.className = "styled-select-option";
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.textContent = option.textContent.trim();
        item.setAttribute("aria-disabled", String(option.disabled));
        item.tabIndex = -1;
        item.addEventListener("click", () => choose(option.value));
        return item;
        });
        listbox.replaceChildren(...options);
    }

    buildOptions();
    wrapper.append(trigger, listbox);

    if (label) label.htmlFor = trigger.id;
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.classList.add("styled-select-native");
    select.dataset.styledSelect = "true";

    function sync() {
        const selected = select.options[select.selectedIndex];
        value.textContent = selected?.textContent.trim() || "Select an option";
        if (isRequired && select.value) trigger.removeAttribute("aria-invalid");
        for (const option of options) {
            const isSelected = option.dataset.value === select.value;
            option.setAttribute("aria-selected", String(isSelected));
            option.classList.toggle("is-selected", isSelected);
        }
        trigger.disabled = select.disabled;
        if (select.disabled) close(false);
    }

    function close(returnFocus) {
        listbox.hidden = true;
        wrapper.classList.remove("opens-up");
        trigger.setAttribute("aria-expanded", "false");
        openSelects.delete(control);
        if (returnFocus) trigger.focus();
    }

    function open() {
        if (trigger.disabled) return;
        const bounds = trigger.getBoundingClientRect();
        const desiredHeight = Math.min(220, options.length * 40 + 10);
        const spaceBelow = window.innerHeight - bounds.bottom - 12;
        const openUp = spaceBelow < desiredHeight && bounds.top > desiredHeight;
        const availableSpace = openUp ? bounds.top - 12 : spaceBelow;
        const menuHeight = Math.max(80, Math.min(desiredHeight, availableSpace));
        const menuWidth = Math.min(bounds.width, window.innerWidth - 16);
        const menuLeft = Math.max(8, Math.min(bounds.left, window.innerWidth - menuWidth - 8));

        listbox.style.left = `${menuLeft}px`;
        listbox.style.width = `${menuWidth}px`;
        listbox.style.maxHeight = `${menuHeight}px`;
        listbox.style.top = openUp
            ? `${Math.max(8, bounds.top - menuHeight - 5)}px`
            : `${Math.min(window.innerHeight - menuHeight - 8, bounds.bottom + 5)}px`;
        listbox.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        openSelects.add(control);
        const selected = options.find(option =>
            option.dataset.value === select.value && option.getAttribute("aria-disabled") !== "true"
        ) || options.find(option => option.getAttribute("aria-disabled") !== "true");
        selected?.focus();
        selected?.scrollIntoView({ block: "nearest" });
    }

    function choose(selectedValue) {
        if (select.value !== selectedValue) {
            select.value = selectedValue;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        sync();
        close(true);
    }

    const control = { wrapper, close };
    const onChange = () => sync();
    const onReset = () => queueMicrotask(sync);
    const onSubmit = event => {
        if (!isRequired || select.value) {
            trigger.removeAttribute("aria-invalid");
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        trigger.setAttribute("aria-invalid", "true");
        open();
    };
    const onTriggerClick = () => listbox.hidden ? open() : close(false);
    const onTriggerKeydown = event => {
        if (["ArrowDown", "ArrowUp", "Enter", " ", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            open();
            if (event.key === "Home") options.find(option => option.getAttribute("aria-disabled") !== "true")?.focus();
            if (event.key === "End") [...options].reverse().find(option => option.getAttribute("aria-disabled") !== "true")?.focus();
        } else if (event.key === "Escape" && !listbox.hidden) {
            event.preventDefault();
            close(false);
        }
    };
    const onListKeydown = event => {
        const enabledOptions = options.filter(option => option.getAttribute("aria-disabled") !== "true");
        const index = enabledOptions.indexOf(document.activeElement);
        let nextIndex = index;

        if (event.key === "ArrowDown") nextIndex = (index + 1) % enabledOptions.length;
        else if (event.key === "ArrowUp") nextIndex = (index - 1 + enabledOptions.length) % enabledOptions.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = enabledOptions.length - 1;
        else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const active = enabledOptions[index];
            if (active) choose(active.dataset.value);
            return;
        } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
            return;
        } else if (event.key === "Tab") {
            close(false);
            return;
        } else {
            return;
        }

        event.preventDefault();
        enabledOptions[nextIndex]?.focus();
    };

    trigger.addEventListener("click", onTriggerClick);
    trigger.addEventListener("keydown", onTriggerKeydown);
    listbox.addEventListener("keydown", onListKeydown);
    select.addEventListener("change", onChange);
    select.addEventListener("styled-select-sync", onChange);
    select.form?.addEventListener("reset", onReset);
    select.form?.addEventListener("submit", onSubmit, true);
    const observer = new MutationObserver(() => {
        buildOptions();
        sync();
    });
    observer.observe(select, {
        attributes: true,
        attributeFilter: ["disabled", "label", "selected"],
        childList: true,
        characterData: true,
        subtree: true
    });
    sync();

    return () => {
        close(false);
        observer.disconnect();
        select.removeEventListener("change", onChange);
        select.removeEventListener("styled-select-sync", onChange);
        select.form?.removeEventListener("reset", onReset);
        select.form?.removeEventListener("submit", onSubmit, true);
        trigger.removeEventListener("click", onTriggerClick);
        trigger.removeEventListener("keydown", onTriggerKeydown);
        wrapper.remove();
    };
}
