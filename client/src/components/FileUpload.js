// client/src/components/FileUpload.js
import { API_BASE } from "../api.js";

export function createFileUpload(onFileUploaded) {
    const container = document.createElement("div");
    container.className = "file-upload";

    // Иконка загрузки
    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.innerHTML = "📎"; // или <img src="..."> если хочешь
    uploadBtn.title = "Загрузить файл";
    uploadBtn.onclick = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) await uploadFile(file);
        };
        input.click();
    };

    // Обработчик Drag & Drop
    container.addEventListener("dragover", (e) => {
        e.preventDefault();
        container.classList.add("drag-over");
    });

    container.addEventListener("dragleave", () => {
        container.classList.remove("drag-over");
    });

    container.addEventListener("drop", async (e) => {
        e.preventDefault();
        container.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file) await uploadFile(file);
    });

    // Функция загрузки
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("http://localhost:3001/api/files", {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                onFileUploaded(data); // уведомляем чат
            } else {
                alert("Ошибка загрузки");
            }
        } catch (err) {
            console.error(err);
            alert("Не удалось загрузить файл");
        }
    }

    container.appendChild(uploadBtn);
    return container;
}
