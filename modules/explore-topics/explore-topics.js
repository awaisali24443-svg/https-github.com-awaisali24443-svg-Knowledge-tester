import { getCategories } from '../../services/topicService.js';

export async function init() {
    const gridContainer = document.getElementById('category-grid');
    if (!gridContainer) return;
    
    try {
        const categories = await getCategories();
        if (categories.length > 0) {
            gridContainer.innerHTML = categories.map(category => `
                <a href="#topics/${category.id}" class="category-card">
                    <div>
                        <div class="card-header">
                            <div class="card-icon">${category.icon}</div>
                            <div class="card-title">
                                <h3>${category.name}</h3>
                            </div>
                        </div>
                        <p class="card-description">${category.description}</p>
                    </div>
                    <div class="card-footer">
                        <span>View Topics →</span>
                    </div>
                </a>
            `).join('');
        } else {
            gridContainer.innerHTML = '<p>No categories available at the moment.</p>';
        }
    } catch (error) {
        console.error("Failed to load categories:", error);
        gridContainer.innerHTML = '<p>Could not load categories. Please try again later.</p>';
    }
}

export function destroy() {
    console.log("Explore Topics module destroyed.");
}
