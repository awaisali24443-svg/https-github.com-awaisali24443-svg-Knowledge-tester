
// services/seoService.js
import { getCategoryById } from './topicService.js';

const siteName = "Knowledge Tester";
const defaultTitle = `${siteName} | AI-Powered Quizzes on Any Topic`;
const defaultDescription = "Instantly generate custom quizzes on any subject with our AI-powered tool. Explore curated topics, save questions to your library, and master new skills. Your personal learning companion.";

const metaConfig = {
    'Home': {
        title: defaultTitle,
        description: defaultDescription,
    },
    'Custom Quiz': {
        title: `Custom Quiz Generator | ${siteName}`,
        description: `Generate a unique quiz on any topic in seconds. Enter your subject and let our AI create a challenge for you.`,
    },
    'My Library': {
        title: `My Library | ${siteName}`,
        description: `Review and manage your saved questions from previous quizzes to reinforce your learning.`,
    },
    'Study Mode': {
        title: `Study Mode | ${siteName}`,
        description: `Master your saved questions using our interactive flashcard study mode.`,
    },
    'Settings': {
        title: `Settings | ${siteName}`,
        description: `Customize your theme, accessibility options, and other preferences.`,
    },
};

async function getPageMeta(routeName, params = {}) {
    const config = metaConfig[routeName] || {};
    let title = config.title || defaultTitle;
    let description = config.description || defaultDescription;

    // Handle dynamic routes
    if (routeName === 'Topic List' && params.categoryId) {
        try {
            const category = await getCategoryById(params.categoryId);
            if (category) {
                const dynamicParams = { categoryName: category.name };
                title = typeof config.title === 'function' ? config.title(dynamicParams) : defaultTitle;
                description = typeof config.description === 'function' ? config.description(dynamicParams) : defaultDescription;
            }
        } catch (error) {
            console.error(`Could not fetch category for SEO tags: ${error}`);
        }
    }
    
    return { title, description };
}

export async function updateMetaTags(routeName, params) {
    const { title, description } = await getPageMeta(routeName, params);

    // Update standard meta tags
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);

    // Update Open Graph meta tags for social sharing
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    
    // Update the canonical URL to reflect the current view
    const canonicalUrl = `${window.location.origin}${window.location.pathname}${window.location.hash || ''}`;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
}