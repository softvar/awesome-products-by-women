var utils = {
	sortOn: function (arr, key, orderBy) {
		arr.sort(function (a, b) {
			return orderBy ? b[key] - a[key] : a[key] - b[key];
		});
	}
};
exports.sortOn = utils.sortOn;
