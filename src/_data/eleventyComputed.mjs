export default {
	header_text: (data) => data.header_text || data.title,
	meta_title: (data) => data.meta_title || data.title,
};
