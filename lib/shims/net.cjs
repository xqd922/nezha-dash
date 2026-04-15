function isIPv4(value) {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }

    const number = Number(part);
    return number >= 0 && number <= 255 && String(number) === part;
  });
}

function isIPv6(value) {
  try {
    const parsed = new URL(`http://[${value}]/`);
    return parsed.hostname === `[${value}]`;
  } catch {
    return false;
  }
}

function isIP(value) {
  if (typeof value !== "string" || value.length === 0) {
    return 0;
  }

  if (isIPv4(value)) {
    return 4;
  }

  if (isIPv6(value)) {
    return 6;
  }

  return 0;
}

module.exports = {
  isIP,
};

module.exports.default = module.exports;
