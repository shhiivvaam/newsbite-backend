declare const prismaClientSingleton: () => any;
declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}
declare const prisma: any;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map