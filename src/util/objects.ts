export function compareKeys(base: any, compare: any): boolean {
    for (const key of Object.keys(base)) {
        if (!(key in compare)) return false;
        else if (
            typeof base[key] === "object" &&
            !compareKeys(base[key], compare[key])
        )
            return false;
    }

    return true;
}
