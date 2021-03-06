export default `
#if defined(dSizeType_uniform)
    float size = uSize;
#elif defined(dSizeType_attribute)
    float size = aSize;
#elif defined(dSizeType_instance)
    float size = decodeFloatRGB(readFromTexture(tSize, aInstance, uSizeTexDim).rgb);
#elif defined(dSizeType_group)
    float size = decodeFloatRGB(readFromTexture(tSize, group, uSizeTexDim).rgb);
#elif defined(dSizeType_groupInstance)
    float size = decodeFloatRGB(readFromTexture(tSize, aInstance * float(uGroupCount) + group, uSizeTexDim).rgb);
#endif

#if defined(dSizeType_instance) || defined(dSizeType_group) || defined(dSizeType_groupInstance)
    size /= 100.0; // NOTE factor also set in TypeScript
#endif

size *= uSizeFactor;
`;