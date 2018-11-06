/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { Vec3 } from 'mol-math/linear-algebra';
import { Unit, StructureElement, Structure } from 'mol-model/structure';
import { Loci, EmptyLoci } from 'mol-model/loci';
import { Interval, OrderedSet } from 'mol-data/int';
import { SizeTheme, SizeThemeName } from 'mol-theme/size';
import { Mesh } from 'mol-geo/geometry/mesh/mesh';
import { sphereVertexCount } from 'mol-geo/primitive/sphere';
import { MeshBuilder } from 'mol-geo/geometry/mesh/mesh-builder';
import { addSphere } from 'mol-geo/geometry/mesh/builder/sphere';
import { PickingId } from 'mol-geo/geometry/picking';
import { LocationIterator } from 'mol-geo/util/location-iterator';
import { VisualContext } from 'mol-repr';

export interface ElementSphereMeshProps {
    sizeTheme: SizeThemeName,
    sizeValue: number,
    detail: number,
}

export async function createElementSphereMesh(ctx: VisualContext, unit: Unit, structure: Structure, props: ElementSphereMeshProps, mesh?: Mesh) {
    const { detail } = props

    const { elements } = unit;
    const sizeTheme = SizeTheme({ name: props.sizeTheme, value: props.sizeValue })
    const elementCount = elements.length;
    const vertexCount = elementCount * sphereVertexCount(detail)
    const meshBuilder = MeshBuilder.create(vertexCount, vertexCount / 2, mesh)

    const v = Vec3.zero()
    const pos = unit.conformation.invariantPosition
    const l = StructureElement.create()
    l.unit = unit

    for (let i = 0; i < elementCount; i++) {
        l.element = elements[i]
        pos(elements[i], v)

        meshBuilder.setGroup(i)
        addSphere(meshBuilder, v, sizeTheme.size(l), detail)

        if (i % 10000 === 0 && ctx.runtime.shouldUpdate) {
            await ctx.runtime.update({ message: 'Sphere mesh', current: i, max: elementCount });
        }
    }

    return meshBuilder.getMesh()
}

export function markElement(loci: Loci, group: Unit.SymmetryGroup, apply: (interval: Interval) => boolean) {
    const elementCount = group.elements.length

    let changed = false
    if (StructureElement.isLoci(loci)) {
        for (const e of loci.elements) {
            const unitIdx = group.unitIndexMap.get(e.unit.id)
            if (unitIdx !== undefined) {
                if (Interval.is(e.indices)) {
                    const start = unitIdx * elementCount + Interval.start(e.indices);
                    const end = unitIdx * elementCount + Interval.end(e.indices);
                    if (apply(Interval.ofBounds(start, end))) changed = true
                } else {
                    for (let i = 0, _i = e.indices.length; i < _i; i++) {
                        const idx = unitIdx * elementCount + e.indices[i];
                        if (apply(Interval.ofSingleton(idx))) changed = true
                    }
                }
            }
        }
    }
    return changed
}

export function getElementLoci(pickingId: PickingId, group: Unit.SymmetryGroup, id: number) {
    const { objectId, instanceId, groupId } = pickingId
    if (id === objectId) {
        const unit = group.units[instanceId]
        const indices = OrderedSet.ofSingleton(groupId as StructureElement.UnitIndex);
        return StructureElement.Loci([{ unit, indices }])
    }
    return EmptyLoci
}

export namespace StructureElementIterator {
    export function fromGroup(group: Unit.SymmetryGroup): LocationIterator {
        const groupCount = group.elements.length
        const instanceCount = group.units.length
        const location = StructureElement.create()
        const getLocation = (groupIndex: number, instanceIndex: number) => {
            const unit = group.units[instanceIndex]
            location.unit = unit
            location.element = unit.elements[groupIndex]
            return location
        }
        return LocationIterator(groupCount, instanceCount, getLocation)
    }
}