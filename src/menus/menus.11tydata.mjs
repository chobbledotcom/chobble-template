export default {
    eleventyComputed: {
        eleventyNavigation: (data) => {
            return {
                key: data.title,
                parent: "Menus",
                order: data.order || 0,
            };
        },
    },
};